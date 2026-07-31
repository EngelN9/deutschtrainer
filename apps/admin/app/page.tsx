import Link from "next/link";

export default function HomePage() {
  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="主要導覽">
        <Link className="public-brand" href="/">
          <span className="brand-mark small" aria-hidden="true">
            DT
          </span>
          DeutschTrainer
        </Link>
        <div>
          <Link href="/support">支援</Link>
          <Link href="/privacy">隱私</Link>
          <Link href="/terms">服務條款</Link>
        </div>
      </nav>

      <section className="public-hero">
        <p className="public-eyebrow">B1–C2 · 繁體中文德語自學</p>
        <h1>以有脈絡的練習，建立可以長期保留的德語能力。</h1>
        <p>
          DeutschTrainer 的主要學習產品是 Android
          App，涵蓋固定題練習、學習進度、間隔複習與錯誤分析。部分功能需要網路連線與已啟用的服務。
        </p>
        <div className="public-actions">
          <Link className="button button-primary" href="/support">
            取得支援
          </Link>
          <Link className="button button-secondary" href="/account-deletion">
            帳號與資料刪除
          </Link>
        </div>
      </section>

      <section className="public-grid" aria-label="產品原則">
        <article>
          <h2>分級內容</h2>
          <p>以 CEFR B1–C2 組織課程，搭配繁體中文說明與經審核的答案解析。</p>
        </article>
        <article>
          <h2>可追蹤的複習</h2>
          <p>依正式提交結果更新熟練度、錯誤紀錄與複習排程。</p>
        </article>
        <article>
          <h2>清楚的功能邊界</h2>
          <p>離線固定題與需連線的 AI 功能分開呈現，不以模擬結果冒充正式服務。</p>
        </article>
      </section>
    </main>
  );
}
