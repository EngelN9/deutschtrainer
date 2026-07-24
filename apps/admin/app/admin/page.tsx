import type { Metadata } from "next";
import { AdminAccessDenied, AdminAccessGate } from "../../src/components/AdminAccessGate";
import { AdminConsole } from "../../src/components/AdminConsole";
import { isContentTeamRole } from "../../src/lib/adminRepository";
import { createAdminServerClient } from "../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "內容管理後台",
  description: "DeutschTrainer 課程、題目、審核與發布管理後台。",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default async function AdminPage() {
  const supabase = await createAdminServerClient();
  if (!supabase) {
    return <AdminAccessGate />;
  }

  const claimsResult = await supabase.auth.getClaims();
  const authUserId = claimsResult.data?.claims?.sub;
  if (claimsResult.error || !authUserId) {
    return <AdminAccessGate />;
  }

  const profileResult = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", authUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileResult.error || !isContentTeamRole(profileResult.data?.role)) {
    return <AdminAccessDenied />;
  }

  return <AdminConsole />;
}
