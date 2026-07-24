"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, TriangleAlert } from "lucide-react";
import { createAdminRepository } from "../lib/adminRepository";
import { AdminLogin } from "./AdminLogin";

export function AdminAccessGate() {
  const router = useRouter();
  const [configError] = useState(() => {
    try {
      return createAdminRepository() ? "" : "缺少 Supabase 公開環境設定。";
    } catch (error) {
      return error instanceof Error ? error.message : "管理後台環境設定無效。";
    }
  });
  const repository = useMemo(() => {
    if (configError) return undefined;
    try {
      return createAdminRepository();
    } catch {
      return undefined;
    }
  }, [configError]);

  if (!repository) {
    return (
      <main className="state-screen state-error">
        <TriangleAlert size={28} />
        <strong>管理後台環境尚未設定</strong>
        <p>{configError || "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。"}</p>
      </main>
    );
  }

  return <AdminLogin repository={repository} onSignedIn={() => router.refresh()} />;
}

export function AdminAccessDenied() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const repository = createAdminRepository();
      await repository?.signOut();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登出失敗。");
      setBusy(false);
    }
  }

  return (
    <main className="state-screen state-error">
      <ShieldCheck size={30} />
      <strong>此帳號沒有內容管理權限</strong>
      <p>只有 content_editor、reviewer 或 admin 角色可以進入此工作區。</p>
      {error ? <p className="form-error">{error}</p> : null}
      <button
        className="button button-secondary"
        disabled={busy}
        onClick={() => void signOut()}
        type="button"
      >
        <LogOut size={16} />
        登出
      </button>
    </main>
  );
}
