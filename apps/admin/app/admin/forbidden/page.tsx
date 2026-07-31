import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminSignOut } from "../../../src/components/AdminSignOut";

export const dynamic = "force-dynamic";

export default function ForbiddenPage() {
  return (
    <main className="state-screen state-error">
      <ShieldAlert size={30} />
      <strong>此帳號沒有內容管理權限</strong>
      <p>管理資料未載入。請改用已授權的內容團隊帳號，或返回公開網站。</p>
      <div className="public-actions">
        <AdminSignOut />
        <Link className="button button-secondary" href="/">
          返回首頁
        </Link>
      </div>
    </main>
  );
}
