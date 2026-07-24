import type { Metadata } from "next";
import { Bug, GitBranch, ShieldAlert } from "lucide-react";
import { PublicPage } from "../../src/components/PublicShell";

export const metadata: Metadata = {
  title: "支援與聯絡",
  description: "取得 DeutschTrainer 安裝、帳號、同步與錯誤回報協助。",
};

export default function SupportPage() {
  return (
    <PublicPage
      kicker="SUPPORT"
      title="把問題說清楚，我們才能把它修好。"
      intro="目前以 GitHub 作為公開測試、版本與一般問題的主要聯絡入口。請先判斷問題類型，並避免把私人資料貼到公開頁面。"
    >
      <section className="support-grid">
        <article>
          <GitBranch size={25} aria-hidden="true" />
          <h2>一般問題與功能建議</h2>
          <p>安裝失敗、畫面問題、課程錯字或功能建議可建立 GitHub Issue。</p>
          <a
            className="site-button site-button-primary"
            href="https://github.com/EngelN9/deutschtrainer/issues/new"
          >
            建立 Issue
          </a>
        </article>
        <article>
          <Bug size={25} aria-hidden="true" />
          <h2>回報時請附上</h2>
          <ul>
            <li>App 版本與 release ID</li>
            <li>Android／瀏覽器版本與裝置型號</li>
            <li>可重現步驟、預期與實際結果</li>
            <li>已遮蔽 email、token 與私人內容的畫面</li>
          </ul>
        </article>
        <article className="support-security">
          <ShieldAlert size={25} aria-hidden="true" />
          <h2>安全或隱私問題</h2>
          <p>
            不要在公開 Issue 張貼密碼、JWT、API
            key、電子郵件、作文、錄音、逐字稿或可利用的安全細節。 安全問題請使用 GitHub repository
            的 Private vulnerability reporting。
          </p>
          <a
            className="text-link"
            href="https://github.com/EngelN9/deutschtrainer/security/advisories/new"
          >
            私密回報安全問題
          </a>
        </article>
      </section>

      <section className="page-section">
        <h2>常見檢查</h2>
        <div className="faq-list">
          <details>
            <summary>Android Demo 為什麼不能登入？</summary>
            <p>Demo 是無帳號、離線展示版。需要登入與同步的功能只會出現在連線 Preview／正式版。</p>
          </details>
          <details>
            <summary>連線 Preview 第一次開啟很慢？</summary>
            <p>
              驗收期間的免費 API
              服務可能休眠；首次請求喚醒後再重試一次。正式部署會重新評估服務方案。
            </p>
          </details>
          <details>
            <summary>可以刪除作文、錄音或整個帳號嗎？</summary>
            <p>可以。個別作文與錄音可在對應功能中刪除；整個帳號請依刪除帳號頁面的步驟操作。</p>
          </details>
        </div>
      </section>
    </PublicPage>
  );
}
