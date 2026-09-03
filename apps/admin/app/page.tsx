import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, RotateCcw, ShieldCheck } from "lucide-react";

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
          <span>
            DeutschTrainer
            <small>B1–C2 learning system</small>
          </span>
        </Link>
        <div>
          <Link href="/support">支援</Link>
          <Link href="/status">狀態</Link>
          <Link href="/privacy">隱私</Link>
          <Link href="/terms">服務條款</Link>
        </div>
      </nav>

      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="preview-badge">Connected Web Preview</span>
          <p className="public-eyebrow">B1–C2 · 為繁體中文學習者設計</p>
          <h1>
            不是再多做一題，
            <br />
            而是知道下一步該改什麼。
          </h1>
          <p>
            透過短文、三個關鍵回饋、重寫比較與間隔複習，把每次練習整理成一條清楚的德語進步路徑。
          </p>
          <div className="public-actions">
            <a className="button button-primary public-primary-action" href={learnerWebUrl}>
              開始使用 Web Preview
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <Link className="public-text-link" href="/support">
              先了解功能與支援範圍
            </Link>
          </div>
          <p className="public-boundary-note">
            Web Preview 是連線預覽，不代表 Android 實機、AI 品質或正式發布驗收已完成。
          </p>
        </div>

        <div className="hero-visual" aria-label="DeutschTrainer 寫作流程介面示意">
          <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
          <div className="app-preview">
            <div className="preview-topline">
              <span>今日輸出訓練</span>
              <strong>B2</strong>
            </div>
            <h2>Schreiben. Verstehen. Verbessern.</h2>
            <div className="preview-steps" aria-hidden="true">
              <span className="active">1</span>
              <i />
              <span>2</span>
              <i />
              <span>3</span>
              <i />
              <span>4</span>
            </div>
            <div className="preview-card preview-card-primary">
              <PenLine size={20} aria-hidden="true" />
              <div>
                <small>今天先做這件事</small>
                <strong>完成一篇短文</strong>
              </div>
            </div>
            <div className="preview-feedback">
              <span>01</span>
              <div>
                <strong>先處理三個重點</strong>
                <small>語序 · 格位 · 表達自然度</small>
              </div>
            </div>
            <button type="button" tabIndex={-1}>
              開始輸出訓練
            </button>
          </div>
        </div>
      </section>

      <section className="public-value-section" aria-labelledby="value-heading">
        <div className="public-section-heading">
          <p className="public-eyebrow">A focused learning loop</p>
          <h2 id="value-heading">把複雜的學習資料，整理成現在做得到的行動。</h2>
        </div>
        <div className="public-grid">
          <article>
            <span className="public-feature-icon">
              <PenLine size={22} />
            </span>
            <h3>輸出優先</h3>
            <p>先寫，再看三個最值得修正的問題；完整 rubric 留在需要時再展開。</p>
          </article>
          <article>
            <span className="public-feature-icon accent">
              <RotateCcw size={22} />
            </span>
            <h3>有理由的複習</h3>
            <p>清楚標示到期原因與預估時間，不把單一熟練度數字包裝成學習成效。</p>
          </article>
          <article>
            <span className="public-feature-icon teal">
              <BookOpen size={22} />
            </span>
            <h3>繁中脈絡</h3>
            <p>以 CEFR B1–C2 組織內容，保留德語細節並提供繁體中文理解支架。</p>
          </article>
        </div>
      </section>

      <section className="public-trust-band">
        <ShieldCheck size={27} aria-hidden="true" />
        <div>
          <h2>功能邊界也應該是使用體驗的一部分。</h2>
          <p>離線、連線、AI 與內容審核狀態會如實呈現；Demo 不建立假的帳號、同步或 AI 結果。</p>
        </div>
      </section>

      <footer className="public-footer">
        <span>© DeutschTrainer</span>
        <div>
          <Link href="/support">支援</Link>
          <Link href="/privacy">隱私</Link>
          <Link href="/terms">條款</Link>
          <Link href="/account-deletion">帳號與資料刪除</Link>
        </div>
      </footer>
    </main>
  );
}
