import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  classroomBoardReducer,
  initialClassroomBoardState,
  type ClassroomBoardAction,
  type ClassroomBoardState,
  type OperationResult,
} from "./boardReducer";
import { ClassroomBoard } from "./ClassroomBoard";
import { readClassroomPublicConfig } from "./config";
import { MILESTONE_TURN_ID, milestoneOperations } from "./milestoneFixture";
import {
  createClassroomConnection,
  parseToolArguments,
  type ClassroomConnection,
  type ClassroomInputMode,
  type ClassroomConnectionStatus,
} from "./realtimeClient";

const SESSION_SECONDS = 300;

export function App() {
  const configuration = useMemo(() => {
    try {
      return { config: readClassroomPublicConfig(import.meta.env) };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "虛擬教室設定無效。",
      };
    }
  }, []);
  const config = configuration.config;
  const supabase = useMemo(
    () =>
      config
        ? // The classroom runs in a same-origin iframe inside the learner web app, so this client
          // and the host's share one localStorage session under the same sb-<ref>-auth-token key.
          // auth-js 2.110.5 has no cross-realm refresh lock — its single-flight is per document —
          // so two auto-refreshing clients would race the same refresh token and one could be
          // signed out. The host owns refresh; this client only reads, and still receives
          // TOKEN_REFRESHED over the same-origin BroadcastChannel that persistSession opens.
          createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: { autoRefreshToken: false, detectSessionInUrl: false },
          })
        : undefined,
    [config],
  );
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  if (!config || !supabase) {
    return <FatalConfiguration message={configuration.error ?? "虛擬教室設定無效。"} />;
  }
  if (!session) {
    return <SignedOutNotice />;
  }
  return <ClassroomSession config={config} session={session} supabase={supabase} />;
}

// The classroom is only ever reached from inside the signed-in learner web app, which shares this
// origin and therefore this session. There is no login form here: signing in from a nested frame
// would write the same storage key the host owns.
function SignedOutNotice() {
  return (
    <main className="centered-page">
      <section className="auth-card" aria-labelledby="signed-out-title">
        <p className="eyebrow">Phase 0 · 內部驗證</p>
        <h1 id="signed-out-title">尚未登入</h1>
        <p>請先回到 DeutschTrainer 主畫面登入，再進入虛擬教室。</p>
      </section>
    </main>
  );
}

function ClassroomSession({
  config,
  session,
  supabase,
}: {
  config: ReturnType<typeof readClassroomPublicConfig>;
  session: Session;
  supabase: SupabaseClient;
}) {
  const [board, setBoard] = useState(initialClassroomBoardState);
  const boardRef = useRef<ClassroomBoardState>(initialClassroomBoardState);
  const [status, setStatus] = useState<ClassroomConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("尚未開始");
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS);
  const [sessionMode, setSessionMode] = useState<ClassroomInputMode>("voice");
  const [eligibility, setEligibility] = useState<"checking" | "eligible" | "ineligible">(
    "checking",
  );
  const [eligibilityMessage, setEligibilityMessage] = useState("正在確認學習者資格…");
  const connectionRef = useRef<ClassroomConnection | undefined>(undefined);
  const connectAbortRef = useRef<AbortController | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    async function checkEligibility() {
      if (!session.user.email_confirmed_at) {
        if (active) {
          setEligibility("ineligible");
          setEligibilityMessage("請先完成 Email 驗證後再使用虛擬教室。");
        }
        return;
      }
      const result = await supabase
        .from("profiles")
        .select("role")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (result.error || result.data?.role !== "learner") {
        setEligibility("ineligible");
        setEligibilityMessage("虛擬教室只開放給有效的 learner 帳號。");
      } else {
        setEligibility("eligible");
        setEligibilityMessage("學習者資格已確認。最終 allowlist 仍由 API 驗證。");
      }
    }
    void checkEligibility();
    return () => {
      active = false;
    };
  }, [session, supabase]);

  useEffect(() => {
    if (status !== "connected") return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (remainingSeconds === 0) teardownClassroom();
  }, [remainingSeconds]);

  // Unmount alone is not enough: navigating away in the host app removes this iframe, and closing
  // the tab ends the document — both destroy it without running React cleanup. An abandoned session
  // would then keep a paid provider call open and, because the database allows one active session
  // per learner, lock the learner out until it expires. teardownClassroom only reads refs, so the
  // first render's closure stays correct for the life of the listener.
  useEffect(() => {
    window.addEventListener("pagehide", teardownClassroom);
    return () => {
      window.removeEventListener("pagehide", teardownClassroom);
      teardownClassroom();
    };
  }, []);

  function applyBoardAction(action: ClassroomBoardAction): OperationResult | undefined {
    const next = classroomBoardReducer(boardRef.current, action);
    boardRef.current = next;
    setBoard(next);
    return next.lastOperationResult;
  }

  // Cancels both an established connection and one still being negotiated. The controller is
  // created before the await in startClassroom, so Stop works during the microphone prompt and
  // the SDP exchange — the window in which connectionRef is still undefined.
  function teardownClassroom() {
    connectAbortRef.current?.abort();
    connectAbortRef.current = undefined;
    connectionRef.current?.stop();
    connectionRef.current = undefined;
  }

  async function startClassroom(inputMode: ClassroomInputMode) {
    if (!audioRef.current || eligibility !== "eligible") return;
    setSessionMode(inputMode);
    setRemainingSeconds(SESSION_SECONDS);
    teardownClassroom();
    const controller = new AbortController();
    connectAbortRef.current = controller;
    try {
      const connection = await createClassroomConnection({
        accessToken: session.access_token,
        apiBaseUrl: config.apiBaseUrl,
        audioElement: audioRef.current,
        inputMode,
        signal: controller.signal,
        callbacks: {
          onOperation: (operation, turnId) =>
            applyBoardAction({ type: "apply_operation", operation, turnId }),
          onStatus: (nextStatus, message) => {
            setStatus(nextStatus);
            setStatusMessage(message);
          },
          onSupersedeTurn: (turnId) => applyBoardAction({ type: "supersede_turn", turnId }),
          onTurnStarted: (turnId) => applyBoardAction({ type: "begin_turn", turnId }),
        },
      });
      // Stop may have landed between the last abort check and here.
      if (controller.signal.aborted) {
        connection.stop();
        return;
      }
      connectionRef.current = connection;
    } catch {
      connectionRef.current = undefined;
    }
  }

  function stopClassroom() {
    teardownClassroom();
  }

  function runSimulator() {
    boardRef.current = initialClassroomBoardState;
    setBoard(initialClassroomBoardState);
    applyBoardAction({ type: "begin_turn", turnId: MILESTONE_TURN_ID });
    for (const operation of milestoneOperations) {
      const parsedOperation = parseToolArguments(JSON.stringify(operation), operation.type);
      applyBoardAction({
        type: "apply_operation",
        operation: parsedOperation,
        turnId: MILESTONE_TURN_ID,
      });
    }
    setStatusMessage("Deterministic 開發模擬已完成；這不是 AI 或 provider 驗收。");
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  const active =
    status === "connecting" || status === "connected" || status === "requesting_microphone";
  const connected = status === "connected";
  const sessionProgress = Math.max(0, Math.min(100, (remainingSeconds / SESSION_SECONDS) * 100));
  const statusTone =
    status === "error" ? "error" : connected ? "success" : active ? "active" : "neutral";

  return (
    <main className="classroom-shell">
      <header className="classroom-hero">
        <div className="hero-copy">
          <p className="eyebrow">DeutschTrainer AI · 5 分鐘練習</p>
          <h1>和 AI 導師一起，把德語說清楚</h1>
          <p className="hero-lead">
            用語音或文字練習真實情境；導師會把句型、修正與繁中提示整理到共享白板。
          </p>
        </div>
        <div className={`live-status live-status-${statusTone}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>
            <small>課堂狀態</small>
            <strong>{statusMessage}</strong>
          </span>
        </div>
      </header>

      <section className="session-bar" aria-label="教室狀態">
        <div className="session-eligibility">
          <span className="session-label">使用資格</span>
          <strong>{eligibilityMessage}</strong>
        </div>
        <div className="session-timer">
          <div className="timer-copy">
            <span className="session-label">本堂剩餘時間</span>
            <strong className={remainingSeconds < 60 ? "timer-warning" : undefined}>
              {minutes}:{seconds}
            </strong>
          </div>
          <div className="timer-track" aria-hidden="true">
            <span style={{ width: `${sessionProgress}%` }} />
          </div>
        </div>
      </section>

      <div className="classroom-layout">
        <aside className="tutor-panel" aria-labelledby="controls-title">
          <div className="tutor-heading">
            <span className="tutor-mark" aria-hidden="true">
              AI
            </span>
            <div>
              <p className="section-kicker">你的練習夥伴</p>
              <h2 id="controls-title">AI 德語導師</h2>
            </div>
          </div>

          {active ? (
            <div className="active-lesson">
              <span className="active-lesson-label">
                {sessionMode === "voice" ? "語音課程進行中" : "文字課程進行中"}
              </span>
              <p>專注完成一句話即可。需要結束時，請使用下方按鈕讓伺服器停止連線。</p>
              <button className="danger-button" onClick={stopClassroom}>
                結束這堂課
              </button>
            </div>
          ) : (
            <>
              <p className="tutor-intro">選擇最適合你現在環境的練習方式。</p>
              <div className="mode-list">
                <button
                  className="mode-button mode-button-primary"
                  disabled={eligibility !== "eligible"}
                  onClick={() => void startClassroom("voice")}
                >
                  <span className="mode-icon" aria-hidden="true">
                    01
                  </span>
                  <span>
                    <strong>開始語音練習</strong>
                    <small>使用麥克風和導師即時對話</small>
                  </span>
                </button>
                <button
                  className="mode-button"
                  disabled={eligibility !== "eligible"}
                  onClick={() => void startClassroom("typed")}
                >
                  <span className="mode-icon" aria-hidden="true">
                    02
                  </span>
                  <span>
                    <strong>改用文字練習</strong>
                    <small>不用麥克風，安靜環境也能學</small>
                  </span>
                </button>
              </div>
            </>
          )}

          <div className="lesson-expectations">
            <h3>這堂課會怎麼進行</h3>
            <ol>
              <li>先用一句德語回答導師</li>
              <li>在白板查看句型與修正</li>
              <li>重說一次，確認你真的會了</li>
            </ol>
          </div>

          {import.meta.env.DEV ? (
            <button className="dev-button" onClick={runSimulator}>
              執行白板開發模擬
            </button>
          ) : null}
          <audio ref={audioRef} autoPlay aria-label="AI 導師語音" />
        </aside>

        <section className="board-panel" aria-labelledby="board-title">
          <div className="board-heading">
            <div>
              <p className="section-kicker">Tutor × Whiteboard</p>
              <h2 id="board-title">共享學習白板</h2>
              <p>導師的重點和你的文字會留在這一堂課的白板上；你也可以直接打字或手寫。</p>
            </div>
            <span className="operation-badge">
              {board.processedOperationIds.length > 0
                ? `${board.processedOperationIds.length} 項重點`
                : "等待課堂內容"}
            </span>
          </div>
          {board.lastOperationResult && !board.lastOperationResult.success ? (
            // A rejected operation used to be reported only back to the model, so the board simply
            // stayed blank with no way to tell a silent model from a malformed one.
            <p className="board-operation-error" role="status">
              白板暫時無法顯示導師的最新內容（{board.lastOperationResult.code}
              ）。請繼續對話或稍後重試。
            </p>
          ) : null}
          <ClassroomBoard
            onSendBoardText={(text) => connectionRef.current?.sendLearnerText(text) ?? false}
            state={board}
          />
        </section>
      </div>

      <details className="safety-panel">
        <summary>隱私、AI 限制與課堂結束方式</summary>
        <div className="safety-content">
          <p>你的語音與白板內容不會成為正式學習紀錄；AI 回饋也不等同教師認證或精確發音評分。</p>
          <ul>
            <li>頁面倒數提供進度提示，伺服器仍負責最終到期與中止連線。</li>
            <li>網路或服務中斷時，課程可能提前結束；請保留你想記下的內容。</li>
            <li>AI 可能出錯。重要文法與考試準備仍應查閱可信教材或請教師確認。</li>
          </ul>
        </div>
      </details>
    </main>
  );
}

function FatalConfiguration({ message }: { message: string }) {
  return (
    <main className="centered-page">
      <section className="auth-card">
        <h1>虛擬教室無法啟動</h1>
        <p className="error-message" role="alert">
          {message}
        </p>
        <p>請由部署管理者完成公開環境設定；不要把 server secret 放進 VITE_ 變數。</p>
      </section>
    </main>
  );
}
