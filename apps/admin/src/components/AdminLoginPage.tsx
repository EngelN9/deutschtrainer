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
        <section className="state-card" aria-labelledby="admin-config-title">
          <span className="state-card-icon" aria-hidden="true">
            <TriangleAlert size={28} />
          </span>
          <p className="section-kicker">Configuration required</p>
          <h1 id="admin-config-title">管理後台環境尚未設定</h1>
          <p>缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。</p>
          <small>為保護管理功能，此頁不會使用不安全的預設連線。</small>
        </section>
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
