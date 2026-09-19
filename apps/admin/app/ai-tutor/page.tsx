import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocument } from "../../src/components/PublicDocument";
import { getLearnerWebUrl } from "../../src/lib/learnerWebUrl";

export const metadata: Metadata = {
  title: "AI 德語家教",
  description: "了解 DeutschTrainer AI 的寫作、聽力與口說輔助功能，以及 Email 驗證與公開測試額度。",
  alternates: { canonical: "/ai-tutor" },
};

export default function AiTutorPage() {
  const learnerWebUrl = getLearnerWebUrl();

  return (
    <PublicDocument
      category="AI Tutor · 受限公開測試"
      title="AI 德語家教"
      lead="不只是聊天視窗：從開口、看懂修正，到在白板重組句型，AI 導師陪你完成一輪真正的德語輸出練習。"
    >
      <section className="product-status-callout" aria-labelledby="tutor-status-title">
        <p className="public-eyebrow">目前可用範圍</p>
        <h2 id="tutor-status-title">已驗證帳號可進入受限 AI 測試</h2>
        <p>
          功能、個人額度與平台每日上限均由伺服器控制；服務關閉或額度用完時，介面會清楚說明下一步。
        </p>
      </section>
      <section>
        <h2>三種回饋方式，一個學習目標</h2>
        <div className="product-capability-grid">
          <article>
            <span>01</span>
            <h3>寫作診斷</h3>
            <p>保留原文，逐項看出文法、用字與表達問題，再用重寫確認進步。</p>
          </article>
          <article>
            <span>02</span>
            <h3>口說與逐字稿</h3>
            <p>檢查內容是否完整、節奏是否清楚；不把逐字稿冒充精確發音評分。</p>
          </article>
          <article>
            <span>03</span>
            <h3>語音教室與白板</h3>
            <p>即時練習一句德語，讓導師把句型、修正與繁中提示整理到白板。</p>
          </article>
        </div>
      </section>
      <section>
        <h2>先試課程，再決定是否建立帳號</h2>
        <p>
          不註冊也能先使用固定題課程。AI 功能目前要求登入並完成 Email
          驗證；建立帳號時，試用期間的學習紀錄會保留。
        </p>
        <div className="document-action-row">
          <a className="button button-primary" href={learnerWebUrl}>
            開始使用 DeutschTrainer
          </a>
          <Link className="inline-action-link" href="/privacy">
            了解 AI 與隱私邊界
          </Link>
        </div>
      </section>
    </PublicDocument>
  );
}
