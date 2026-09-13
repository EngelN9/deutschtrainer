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

      <section className="public-grid" aria-label="主題頁面">
        <article>
          <h2>AI 德語家教</h2>
          <p>了解 AI 寫作與口說相關功能的資料邊界、帳號資格與公開測試限制。</p>
          <Link className="inline-action-link" href="/ai-tutor">
            前往 AI 德語家教介紹
          </Link>
        </article>
        <article>
          <h2>Virtual Classroom</h2>
          <p>了解即時虛擬教室的使用資格、時長上限與測試階段狀態。</p>
          <Link className="inline-action-link" href="/virtual-classroom">
            前往虛擬教室介紹
          </Link>
        </article>
        <article>
          <h2>德語 B1–C2 路徑</h2>
          <p>探索適合中高階學習者的文法、輸出與間隔複習安排。</p>
          <Link className="inline-action-link" href="/learn-german-b1-c2">
            前往 B1–C2 學習介紹
          </Link>
        </article>
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
