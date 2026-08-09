import Link from "next/link";
import { PublicDocument } from "../../src/components/PublicDocument";

export default function PrivacyPage() {
  return (
    <PublicDocument
      title="隱私說明"
      lead="本頁說明 DeutschTrainer 的產品資料邊界；正式對外發布前仍須完成法務與部署驗收。"
    >
      <section>
        <h2>可能處理的資料</h2>
        <p>
          連線版可能處理帳號資料、學習紀錄、偏好設定、作文、錄音、轉錄、評量結果與必要的安全／使用量紀錄。Demo
          資料只存於裝置時，不代表已建立雲端帳號。
        </p>
      </section>
      <section>
        <h2>處理原則</h2>
        <ul>
          <li>私人資料依使用者隔離，受 API 授權與資料庫 RLS 保護。</li>
          <li>OpenAI 與 Supabase 的機密金鑰只屬於受保護的伺服器執行環境。</li>
          <li>不以完整作文、錄音、逐字稿或權杖作為一般應用程式 log。</li>
          <li>AI 回饋可能出錯，不代表教師認證或絕對正確。</li>
        </ul>
      </section>
      <section>
        <h2>資料權利</h2>
        <p>
          帳號匯出與刪除的適用範圍及限制，請參閱
          <Link className="inline-action-link" href="/account-deletion">
            帳號與資料刪除
          </Link>
          。
        </p>
      </section>
    </PublicDocument>
  );
}
