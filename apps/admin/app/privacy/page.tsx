import type { Metadata } from "next";
import { PublicPage } from "../../src/components/PublicShell";

export const metadata: Metadata = {
  title: "隱私權政策",
  description: "DeutschTrainer 如何處理帳號、學習、作文、音訊與 AI 使用資料。",
};

export default function PrivacyPage() {
  return (
    <PublicPage
      kicker="PRIVACY POLICY"
      title="隱私權政策"
      intro="本政策說明 DeutschTrainer 在公開驗收、Preview 與正式服務中如何收集、使用、保護與刪除資料。最後更新：2026 年 7 月 24 日。"
    >
      <section className="legal-section">
        <h2>1. 我們處理哪些資料</h2>
        <ul>
          <li>帳號資料：電子郵件、驗證狀態與系統內部使用者識別碼。</li>
          <li>學習設定：目前程度、目標程度、每日目標、時區與通知偏好。</li>
          <li>學習紀錄：作答、分數、錯誤分類、技能掌握、複習排程與課程進度。</li>
          <li>學習者內容：作文版本，以及你主動上傳的口說錄音與其轉錄、分析結果。</li>
          <li>服務紀錄：請求識別碼、功能使用量、AI token／成本 metadata、錯誤與安全稽核紀錄。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>2. 使用目的與處理方式</h2>
        <p>
          資料只用於提供登入、同步、評分、個人化複習、寫作與音訊功能，維護安全、除錯與控制 AI
          使用量。公開課程內容與你的私人學習資料分開儲存；系統不以私人作文或錄音作為公開展示內容。
        </p>
      </section>

      <section className="legal-section">
        <h2>3. AI 與外部服務</h2>
        <p>
          需要 AI 的作答、作文、文字轉語音或語音轉錄，會由 DeutschTrainer 後端轉交模型服務處理；App
          不直接持有 AI 金鑰。系統會盡量只傳送完成該次功能所需的內容。 AI
          回饋可能出錯，不應視為考試評分、法律、醫療或其他專業意見。
        </p>
        <p>
          帳號與資料庫基礎設施使用 Supabase；AI 功能使用 OpenAI。部署與診斷服務可能處理必要的
          IP、請求與錯誤紀錄，實際服務區域可能不在你所在國家或地區。
        </p>
      </section>

      <section className="legal-section">
        <h2>4. 音訊與敏感學習內容</h2>
        <p>
          口說錄音保存在私人儲存空間，路徑與資料列皆依帳號 owner 隔離。聽力逐字稿與答案不由公開 API
          提供。你可刪除個別作文與口說錄音，也可依刪除帳號流程移除整個帳號。
        </p>
      </section>

      <section className="legal-section">
        <h2>5. 保存與刪除</h2>
        <p>
          學習資料在帳號存在期間保存，以提供跨裝置同步與長期趨勢。刪除個別內容時，相關正文或錄音會依
          owner deletion 流程移除；為防濫用與營運稽核，去識別化的使用量或安全紀錄可能保留。
          刪除整個帳號時，系統會移除 Auth 帳號、使用者資料、學習紀錄與使用者上傳內容。
        </p>
      </section>

      <section className="legal-section">
        <h2>6. 安全</h2>
        <p>
          系統使用 HTTPS、Supabase Row Level Security、角色權限、私有 Storage、後端 service-role
          邊界、速率限制、冪等請求與 audit log。沒有任何網路服務能保證絕對安全；若你發現問題，請透過
          支援頁面回報，且不要在公開 Issue 貼出 token、密碼、電子郵件或私人內容。
        </p>
      </section>

      <section className="legal-section">
        <h2>7. 你的選擇</h2>
        <p>
          你可以關閉本機通知、刪除個別作文／錄音，或刪除整個帳號與關聯資料。完整步驟請見
          <a href="/account-deletion">「刪除帳號」</a>。政策如有重大變更，會更新本頁日期與版本。
        </p>
      </section>
    </PublicPage>
  );
}
