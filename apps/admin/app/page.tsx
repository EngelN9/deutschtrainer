import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const learnerWebUrl =
    process.env.NEXT_PUBLIC_LEARNER_WEB_URL?.trim() ||
    "https://deutschtrainer-engeln9-web.onrender.com";

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
          DeutschTrainer AI 是給繁體中文使用者的德語 B1–C2
          學習平台。透過固定題練習、學習進度、間隔複習與錯誤分析建立長期能力；部分功能需要網路連線與已啟用的服務。
        </p>
        <div className="public-actions">
          <a className="button button-primary" href={learnerWebUrl}>
            開始使用 Web 版
          </a>
          <Link className="button button-secondary" href="/support">
            取得支援
          </Link>
          <Link className="button button-secondary" href="/ai-tutor">
            AI 德語家教
          </Link>
          <Link className="button button-secondary" href="/virtual-classroom">
            虛擬教室
          </Link>
          <Link className="button button-secondary" href="/status">
            目前狀態
          </Link>
          <Link className="button button-secondary" href="/account-deletion">
            帳號與資料刪除
          </Link>
        </div>
      </section>

      {/* Learning Loop visual */}
      <section className="public-learning-loop" aria-label="學習循環">
        <h2 className="public-eyebrow">建立長期德語能力</h2>
        <p className="public-lead">
          透過固定題練習、間隔複習與錯誤分析，形成持續的學習循環。
        </p>
        <div className="learning-loop-visual">
          {/* TODO: add SVG or image */}
        </div>
      </section>

      {/* Core pillars grid */}
      <section className="public-pillar-grid" aria-label="核心支柱">
        <article>
          <h2>內容品質</h2>
          <p>CEFR B1–C2，繁體中文說明與審核答案。</p>
        </article>
        <article>
          <h2>AI 助教</h2>
          <p>AI 寫作、口說、聽力輔助，符合測試限制。</p>
        </article>
        <article>
          <h2>離線支援</h2>
          <p>下載課程與固定題，隨時練習。</p>
        </article>
      </section>

      {/* Feature availability matrix */}
      <section className="public-feature-matrix" aria-label="功能可用性">
        <h2 className="public-eyebrow">功能可用性概況</h2>
        <table className="feature-matrix">
          <thead>
            <tr>
              <th>功能</th>
              <th>離線</th>
              <th>連線</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>固定題練習</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>AI 寫作/口說</td>
              <td>❌</td>
              <td>✅ (Beta)</td>
            </tr>
            <tr>
              <td>課程下載</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Trust‑boundary band */}
      <section className="public-trust-band" aria-label="安全與隱私">
        <p>
          所有 AI 功能均受嚴格測試與配額限制，離線功能不依賴雲端。
        </p>
      </section>

      {/* Existing product principles (retain) */}
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
