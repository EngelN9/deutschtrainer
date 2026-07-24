import type { Metadata } from "next";
import { PublicPage } from "../../src/components/PublicShell";

export const metadata: Metadata = {
  title: "服務條款",
  description: "DeutschTrainer 公開驗收與學習服務的使用條款。",
};

export default function TermsPage() {
  return (
    <PublicPage
      kicker="TERMS OF SERVICE"
      title="服務條款"
      intro="使用 DeutschTrainer 前，請了解目前的產品狀態、合理使用規則與 AI 教學限制。最後更新：2026 年 7 月 24 日。"
    >
      <section className="legal-section">
        <h2>1. 服務範圍</h2>
        <p>
          DeutschTrainer 是面向繁體中文使用者的德語 B1–C2
          自學工具。公開驗收階段不提供付款、訂閱、排行榜、社交、公會、虛擬貨幣或即時多人服務。
          GitHub 上的 Demo、Preview 與原始碼可能快速更新，會以發行頁標示各版本的實際能力。
        </p>
      </section>

      <section className="legal-section">
        <h2>2. 帳號與合理使用</h2>
        <ul>
          <li>請提供你有權使用的電子郵件，並妥善保管登入憑證。</li>
          <li>不得規避速率限制、嘗試存取他人資料、破壞服務或大量自動化濫用 AI／音訊功能。</li>
          <li>內容團隊與管理帳號僅限經授權人員使用；資料庫角色與權限不得自行提升。</li>
          <li>發現安全問題時，請使用支援頁面的安全回報方式，不要公開私人資料或可利用細節。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. 教學與 AI 限制</h2>
        <p>
          課程與固定題型依版本化內容與規則提供；AI
          診斷、寫作回饋、轉錄或生成內容可能不完整或有誤。請將其視為學習輔助，重要語言使用仍應查核可靠字典、
          語法資料或合格教師。系統不保證特定考試成績、學習速度或職涯結果。
        </p>
      </section>

      <section className="legal-section">
        <h2>4. 你的內容</h2>
        <p>
          你保留自己提交之作文與錄音的權利，並授權系統在提供評分、轉錄、同步、回饋與除錯所必要的範圍內處理。
          請不要上傳你無權處理的內容，或包含他人不必要的敏感個資。
        </p>
      </section>

      <section className="legal-section">
        <h2>5. 可用性與變更</h2>
        <p>
          Preview
          服務可能因部署、免費託管休眠、資料遷移或維護而暫停。功能、內容與免費使用量可能調整；
          重大安全或資料契約變更會透過版本、文件或本頁說明。正式上線前的測試版本不應用於關鍵用途。
        </p>
      </section>

      <section className="legal-section">
        <h2>6. 停止使用與刪除</h2>
        <p>
          你可隨時停止使用並依<a href="/account-deletion">刪除帳號流程</a>移除帳號與關聯資料。
          對嚴重濫用、安全攻擊或違法行為，系統可能限制或終止存取，同時保留必要的安全稽核證據。
        </p>
      </section>
    </PublicPage>
  );
}
