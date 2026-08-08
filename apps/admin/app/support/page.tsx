import Link from "next/link";
import { PublicDocument } from "../../src/components/PublicDocument";

export default function SupportPage() {
  return (
    <PublicDocument title="支援" lead="遇到登入、同步、課程或帳號問題時，請先保留可重現資訊。">
      <section>
        <h2>回報問題前</h2>
        <ul>
          <li>記錄 App 版本、Build ID、Android 版本與裝置型號。</li>
          <li>描述操作步驟、預期結果、實際結果與發生時間。</li>
          <li>可附不含帳號憑證、存取權杖或私人學習內容的截圖。</li>
        </ul>
      </section>
      <section>
        <h2>隱私提醒</h2>
        <p>
          請勿傳送密碼、JWT、refresh token、API
          key、完整作文、完整錄音或其他人的資料。支援管道完成部署前，不會在此頁虛構聯絡方式。
        </p>
      </section>
      <section>
        <h2>帳號與資料</h2>
        <p>
          若要了解資料刪除範圍與限制，請參閱
          <Link className="inline-action-link" href="/account-deletion">
            帳號與資料刪除
          </Link>
          。
        </p>
      </section>
    </PublicDocument>
  );
}
