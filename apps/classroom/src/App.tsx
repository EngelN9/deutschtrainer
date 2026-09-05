import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
    () => (config ? createClient(config.supabaseUrl, config.supabaseAnonKey) : undefined),
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
    return <LoginScreen supabase={supabase} />;
  }
  return <ClassroomSession config={config} session={session} supabase={supabase} />;
}

function LoginScreen({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage("登入失敗。請確認 DeutschTrainer Email 與密碼後再試。");
    setBusy(false);
  }

  return (
    <main className="centered-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Phase 0 · 內部驗證</p>
        <h1 id="login-title">DeutschTrainer 虛擬教室</h1>
        <p>使用既有 DeutschTrainer 帳號登入。此頁不提供註冊。</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            密碼
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {message ? (
            <p className="error-message" role="alert">
              {message}
            </p>
          ) : null}
          <button type="submit" disabled={busy}>
            {busy ? "登入中…" : "登入"}
          </button>
        </form>
        <p className="privacy-note">不同網站 origin 不共享登入狀態，因此首次進入教室需獨立登入。</p>
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

  useEffect(() => () => teardownClassroom(), []);

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

  async function startClassroom() {
    if (!audioRef.current || eligibility !== "eligible") return;
    setRemainingSeconds(SESSION_SECONDS);
    teardownClassroom();
    const controller = new AbortController();
    connectAbortRef.current = controller;
    try {
      const connection = await createClassroomConnection({
        accessToken: session.access_token,
        apiBaseUrl: config.apiBaseUrl,
        audioElement: audioRef.current,
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
      const parsedOperation = parseToolArguments(JSON.stringify(operation));
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

  return (
    <main className="classroom-shell">
      <header className="classroom-header">
        <div>
          <p className="eyebrow">Phase 0 · 無持久化內部垂直切片</p>
          <h1>德語語音虛擬教室</h1>
        </div>
        <button className="secondary-button" onClick={() => void supabase.auth.signOut()}>
          登出
        </button>
      </header>

      <section className="status-grid" aria-label="教室狀態">
        <StatusCard
          label="帳號"
          value={eligibilityMessage}
          tone={eligibility === "ineligible" ? "error" : "normal"}
        />
        <StatusCard
          label="連線"
          value={statusMessage}
          tone={status === "error" ? "error" : "normal"}
        />
        <StatusCard
          label="剩餘時間"
          value={`${minutes}:${seconds}`}
          tone={remainingSeconds < 60 ? "warning" : "normal"}
        />
      </section>

      <section className="control-panel" aria-labelledby="controls-title">
        <div>
          <h2 id="controls-title">麥克風與連線</h2>
          <p>開始後瀏覽器會要求麥克風權限。Phase 0 上限為 5 分鐘。</p>
        </div>
        <div className="button-row">
          <button
            disabled={active || eligibility !== "eligible"}
            onClick={() => void startClassroom()}
          >
            開始教室
          </button>
          <button className="danger-button" disabled={!active} onClick={stopClassroom}>
            停止並關閉麥克風
          </button>
          {import.meta.env.DEV ? (
            <button className="secondary-button" onClick={runSimulator}>
              執行 deterministic 白板模擬
            </button>
          ) : null}
        </div>
        <audio ref={audioRef} autoPlay aria-label="AI 導師語音" />
      </section>

      <section className="board-panel" aria-labelledby="board-title">
        <div className="board-heading">
          <div>
            <h2 id="board-title">共享白板</h2>
            <p>模型輸出必須先通過 versioned schema 與 reducer，永遠不直接插入 HTML。</p>
          </div>
          <span className="operation-badge">{board.processedOperationIds.length} operations</span>
        </div>
        {board.lastOperationResult && !board.lastOperationResult.success ? (
          // A rejected operation used to be reported only back to the model, so the board simply
          // stayed blank with no way to tell a silent model from a malformed one.
          <p className="board-operation-error" role="status">
            最後一個白板操作被拒絕（{board.lastOperationResult.code}）：
            {board.lastOperationResult.message}
          </p>
        ) : null}
        <ClassroomBoard state={board} />
      </section>

      <aside className="safety-panel">
        <h2>安全與證據邊界</h2>
        <ul>
          <li>不保存語音、白板或學習紀錄。</li>
          <li>5 分鐘瀏覽器計時器會關閉本機資源，但不是惡意 client 下的伺服器成本上限。</li>
          <li>沒有真實 provider、真人德語教學與低延遲證據前，不代表 Realtime AI 已驗收。</li>
          <li>不提供 CEFR 認證或精確發音分數。</li>
        </ul>
      </aside>
    </main>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "normal" | "warning" | "error";
}) {
  return (
    <div className={`status-card status-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
