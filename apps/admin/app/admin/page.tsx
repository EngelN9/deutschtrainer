import { redirect } from "next/navigation";
import { AdminConsole } from "../../src/components/AdminConsole";
import { parseAdminProfile } from "../../src/lib/adminAuthorization";
import { createAdminServerClient } from "../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const client = await createAdminServerClient();
  if (!client) {
    return (
      <main className="state-screen state-error">
        <strong>管理後台環境尚未設定</strong>
        <p>缺少必要的公開 Supabase 連線設定。</p>
      </main>
    );
  }

  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) {
    redirect("/admin/login");
  }

  const profileResult = await client
    .from("profiles")
    .select("id, auth_user_id, display_name, role")
    .eq("auth_user_id", userResult.data.user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileResult.error) {
    return (
      <main className="state-screen state-error">
        <strong>暫時無法驗證管理權限</strong>
        <p>請稍後重試；若問題持續發生，請聯絡系統管理者。</p>
      </main>
    );
  }

  const profile = parseAdminProfile(profileResult.data);
  if (!profile || profile.authUserId !== userResult.data.user.id) {
    redirect("/admin/forbidden");
  }

  return <AdminConsole initialProfile={profile} />;
}
