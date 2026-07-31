"use client";

import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAdminRepository } from "../lib/adminRepository";
import { AdminLogin } from "./AdminLogin";

export function AdminLoginPage() {
  const router = useRouter();
  const repository = useMemo(() => createAdminRepository(), []);

  if (!repository) {
    return (
      <main className="state-screen state-error">
        <TriangleAlert size={28} />
        <strong>管理後台環境尚未設定</strong>
        <p>缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。</p>
      </main>
    );
  }

  return (
    <AdminLogin
      repository={repository}
      onSignedIn={() => {
        router.replace("/admin");
        router.refresh();
      }}
    />
  );
}
