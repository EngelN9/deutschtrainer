import { redirect } from "next/navigation";
import { AdminLoginPage } from "../../../src/components/AdminLoginPage";
import { createAdminServerClient } from "../../../src/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const client = await createAdminServerClient();
  if (client) {
    const userResult = await client.auth.getUser();
    if (!userResult.error && userResult.data.user) {
      redirect("/admin");
    }
  }

  return <AdminLoginPage />;
}
