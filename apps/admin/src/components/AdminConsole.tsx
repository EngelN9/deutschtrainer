"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Bot,
  BookOpen,
  ClipboardCheck,
  FileQuestion,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { createAdminRepository, type AdminRepository } from "../lib/adminRepository";
import type { AdminProfile, AdminWorkspaceData } from "../lib/adminTypes";
import { AdminDashboard } from "./AdminDashboard";
import { AdminLogin } from "./AdminLogin";
import { roleLabels } from "./AdminUi";
import { AiDraftManager } from "./AiDraftManager";
import { AuditManager } from "./AuditManager";
import { CourseManager } from "./CourseManager";
import { ExerciseManager } from "./ExerciseManager";
import { ReviewManager } from "./ReviewManager";

type WorkspaceTab = "dashboard" | "courses" | "exercises" | "reviews" | "ai" | "audit";

const emptyData: AdminWorkspaceData = {
  courses: [],
  activities: [],
  exercises: [],
  versions: [],
  reviews: [],
  generationJobs: [],
  auditLogs: [],
};

const navItems = [
  { id: "dashboard", label: "總覽", icon: LayoutDashboard },
  { id: "courses", label: "課程", icon: BookOpen },
  { id: "exercises", label: "題目", icon: FileQuestion },
  { id: "reviews", label: "審核", icon: ClipboardCheck },
  { id: "ai", label: "AI 草稿", icon: Bot },
  { id: "audit", label: "操作紀錄", icon: ShieldCheck },
] satisfies Array<{ id: WorkspaceTab; label: string; icon: typeof LayoutDashboard }>;

const tabTitles: Record<WorkspaceTab, { title: string; eyebrow: string }> = {
  dashboard: { title: "內容營運總覽", eyebrow: "Dashboard" },
  courses: { title: "課程管理", eyebrow: "Course management" },
  exercises: { title: "題目管理", eyebrow: "Exercise management" },
  reviews: { title: "內容審核", eyebrow: "Editorial review" },
  ai: { title: "AI 草稿", eyebrow: "Human-reviewed generation" },
  audit: { title: "操作紀錄", eyebrow: "Audit log" },
};

export function AdminConsole() {
  const [repository, setRepository] = useState<AdminRepository>();
  const [configMissing, setConfigMissing] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile>();
  const [data, setData] = useState<AdminWorkspaceData>(emptyData);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const nextRepository = createAdminRepository();
    if (!nextRepository) {
      setConfigMissing(true);
      setLoading(false);
      return;
    }
    const activeRepository: AdminRepository = nextRepository;
    setRepository(activeRepository);
    let active = true;

    async function applySession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
      setError("");
      setDenied(false);
      if (!nextSession) {
        setProfile(undefined);
        setData(emptyData);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const nextProfile = await activeRepository.getProfile(nextSession.user.id);
        if (!nextProfile) {
          setDenied(true);
          setProfile(undefined);
          setData(emptyData);
          return;
        }
        const workspace = await activeRepository.loadWorkspace(nextProfile);
        if (active) {
          setProfile(nextProfile);
          setData(workspace);
        }
      } catch (caught) {
        if (active) setError(readError(caught));
      } finally {
        if (active) setLoading(false);
      }
    }

    void activeRepository
      .getSession()
      .then(applySession)
      .catch((caught) => {
        if (active) {
          setError(readError(caught));
          setLoading(false);
        }
      });
    const { data: authListener } = activeRepository.client.auth.onAuthStateChange(
      (_event, nextSession) => void applySession(nextSession),
    );
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const pendingReviewCount = useMemo(
    () => data.reviews.filter((review) => review.status === "pending").length,
    [data.reviews],
  );

  async function refreshWorkspace() {
    if (!repository || !profile) return;
    const workspace = await repository.loadWorkspace(profile);
    setData(workspace);
  }

  async function runMutation(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refreshWorkspace();
      setNotice(successMessage);
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function runTask<T>(action: () => Promise<T>): Promise<T> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      return await action();
    } catch (caught) {
      setError(readError(caught));
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="state-screen">
        <LoaderCircle className="spin" size={28} />
        <strong>載入管理工作區</strong>
      </main>
    );
  }
  if (configMissing) {
    return (
      <main className="state-screen state-error">
        <TriangleAlert size={28} />
        <strong>管理後台環境尚未設定</strong>
        <p>缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。</p>
      </main>
    );
  }
  if (!repository) {
    return null;
  }
  if (!session) {
    return <AdminLogin repository={repository} />;
  }
  if (denied || !profile) {
    return (
      <main className="state-screen state-error">
        <ShieldCheck size={30} />
        <strong>此帳號沒有內容管理權限</strong>
        <button
          className="button button-secondary"
          onClick={() => repository.signOut()}
          type="button"
        >
          <LogOut size={16} />
          登出
        </button>
      </main>
    );
  }

  const heading = tabTitles[activeTab];
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small" aria-hidden="true">
            DT
          </div>
          <div>
            <strong>DeutschTrainer</strong>
            <span>Admin Console</span>
          </div>
        </div>
        <nav aria-label="管理工作區">
          {navItems.map((item) => {
            const Icon = item.icon;
            const count = item.id === "reviews" ? pendingReviewCount : 0;
            return (
              <button
                aria-current={activeTab === item.id ? "page" : undefined}
                className={`nav-item${activeTab === item.id ? " active" : ""}`}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                type="button"
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                {count > 0 ? <span className="nav-count">{count}</span> : null}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-profile">
          <div className="avatar">
            {(profile.displayName || profile.role).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{profile.displayName || "內容管理者"}</strong>
            <span>{roleLabels[profile.role]}</span>
          </div>
          <button
            className="icon-button"
            onClick={() => repository.signOut()}
            title="登出"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div>
            <p>{heading.eyebrow}</p>
            <h1>{heading.title}</h1>
          </div>
          <button
            className="icon-button refresh-button"
            disabled={busy}
            onClick={() => runMutation(refreshWorkspace, "資料已更新。")}
            title="重新整理"
            type="button"
          >
            <RefreshCw className={busy ? "spin" : ""} size={18} />
          </button>
        </header>
        {error ? (
          <div className="alert alert-error" role="alert">
            <TriangleAlert size={17} />
            <span>{error}</span>
            <button className="icon-button" onClick={() => setError("")} title="關閉" type="button">
              <X size={16} />
            </button>
          </div>
        ) : null}
        {notice ? (
          <div className="alert alert-success" role="status">
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice("")}
              title="關閉"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <div className="admin-content">
          {activeTab === "dashboard" ? <AdminDashboard data={data} /> : null}
          {activeTab === "courses" ? (
            <CourseManager
              busy={busy}
              courses={data.courses}
              role={profile.role}
              versions={data.versions}
              onSave={(input) =>
                runMutation(() => repository.saveCourse(input), "課程草稿已保存。")
              }
              onSubmitReview={(course, notes) =>
                runMutation(
                  () => repository.submitReview("course", course.id, course.version, notes),
                  "課程已送出審核。",
                )
              }
              onPublish={(course) =>
                runMutation(
                  () => repository.publish("course", course.id, course.version),
                  "課程已發布並寫入 audit log。",
                )
              }
            />
          ) : null}
          {activeTab === "exercises" ? (
            <ExerciseManager
              activities={data.activities}
              busy={busy}
              exercises={data.exercises}
              repository={repository}
              role={profile.role}
              versions={data.versions}
              onSave={(input) =>
                runMutation(() => repository.saveExercise(input), "題目草稿已保存。")
              }
              onSubmitReview={(exercise, notes) =>
                runMutation(
                  () => repository.submitReview("exercise", exercise.id, exercise.version, notes),
                  "題目已送出審核。",
                )
              }
              onPublish={(exercise) =>
                runMutation(
                  () => repository.publish("exercise", exercise.id, exercise.version),
                  "題目已發布並寫入 audit log。",
                )
              }
            />
          ) : null}
          {activeTab === "reviews" ? (
            <ReviewManager
              busy={busy}
              reviews={data.reviews}
              role={profile.role}
              versions={data.versions}
              onDecision={(reviewId, decision, notes) =>
                runMutation(
                  () => repository.review(reviewId, decision, notes),
                  decision === "approved" ? "內容已核准。" : "內容已退回。",
                )
              }
            />
          ) : null}
          {activeTab === "ai" ? (
            <AiDraftManager
              activities={data.activities}
              busy={busy}
              exercises={data.exercises}
              jobs={data.generationJobs}
              onCompleted={async () => {
                await refreshWorkspace();
                setNotice("AI 草稿已建立，等待人工審核。");
              }}
              onRun={runTask}
              repository={repository}
              role={profile.role}
              session={session}
            />
          ) : null}
          {activeTab === "audit" ? (
            <AuditManager logs={data.auditLogs} role={profile.role} />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function readError(value: unknown): string {
  return value instanceof Error ? value.message : "操作失敗，請稍後重試。";
}
