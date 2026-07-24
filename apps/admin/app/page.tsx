import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  BookOpenText,
  BrainCircuit,
  ChartNoAxesCombined,
  Check,
  MessageSquareText,
  PenLine,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { PublicShell } from "../src/components/PublicShell";

const levelDetails = [
  { level: "B1", title: "站穩生活溝通", detail: "租屋、就醫、旅行與日常書信。" },
  { level: "B2", title: "說清楚觀點", detail: "職場溝通、論證與新聞理解。" },
  { level: "C1", title: "掌握精確表達", detail: "學術寫作、簡報與長篇內容。" },
  { level: "C2", title: "雕琢語氣風格", detail: "細微語意、修辭與專業編輯。" },
];

const featureCards = [
  {
    icon: BookOpenText,
    title: "分級課程與知識庫",
    text: "B1–C2 課程、單字與文法以 CEFR 能力組織，不用經驗值掩蓋真正的學習缺口。",
  },
  {
    icon: BrainCircuit,
    title: "AI 錯誤診斷",
    text: "自由作答與寫作回饋指出文法、用字與表達問題；AI 建議保留限制聲明與重試機制。",
  },
  {
    icon: AudioLines,
    title: "聽力與口說",
    text: "慢速播放、聽寫、私人錄音、轉錄與重錄建議，音訊與逐字稿受到獨立權限保護。",
  },
  {
    icon: WifiOff,
    title: "可離線練習",
    text: "下載課程與固定題型，離線作答後安全同步；衝突不會被靜默丟棄。",
  },
];

export default function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="public-hero">
          <div className="site-container hero-grid">
            <div className="hero-copy">
              <p className="site-kicker">GERMAN, EXPLAINED IN 繁體中文</p>
              <h1>
                真正理解德語，
                <br />從 <span>B1</span> 練到 <span>C2</span>。
              </h1>
              <p className="hero-lead">
                課程、錯題、間隔複習、寫作、聽力與口說都圍繞同一條能力路徑。
                不靠遊戲化分數製造進步感，而是讓你看見下一個該練的地方。
              </p>
              <div className="hero-actions">
                <Link className="site-button site-button-primary" href="/features">
                  查看學習功能
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a
                  className="site-button site-button-quiet"
                  href="https://github.com/EngelN9/deutschtrainer/releases"
                >
                  Android 測試版本
                </a>
              </div>
              <p className="hero-note">
                目前提供離線 Demo；連線 Preview 正在進行實機驗收，不把測試版描述成正式上線產品。
              </p>
            </div>

            <div className="hero-board" aria-label="DeutschTrainer 學習循環">
              <div className="board-heading">
                <span>今天的學習循環</span>
                <strong>35 分鐘</strong>
              </div>
              <ol className="learning-loop">
                <li>
                  <span>01</span>
                  <div>
                    <strong>學一個能力主題</strong>
                    <small>從繁中解釋理解德語規則</small>
                  </div>
                  <Check size={18} aria-hidden="true" />
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>練固定題與自由作答</strong>
                    <small>答案由伺服器與明確規則評分</small>
                  </div>
                  <Check size={18} aria-hidden="true" />
                </li>
                <li className="current">
                  <span>03</span>
                  <div>
                    <strong>修正最重要的錯誤</strong>
                    <small>AI 診斷 + 個人錯題歷史</small>
                  </div>
                  <ArrowRight size={18} aria-hidden="true" />
                </li>
                <li>
                  <span>04</span>
                  <div>
                    <strong>在正確時間複習</strong>
                    <small>依能力掌握度安排下一次練習</small>
                  </div>
                </li>
              </ol>
              <div className="board-footer">
                <ChartNoAxesCombined size={19} aria-hidden="true" />
                <span>追蹤的是能力掌握，不是虛擬貨幣。</span>
              </div>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="產品摘要">
          <div className="site-container proof-grid">
            <div>
              <strong>4</strong>
              <span>個 CEFR 程度</span>
            </div>
            <div>
              <strong>100</strong>
              <span>題人工審核練習</span>
            </div>
            <div>
              <strong>50 + 10</strong>
              <span>單字與文法主題</span>
            </div>
            <div>
              <strong>Owner only</strong>
              <span>作文、錄音與學習紀錄</span>
            </div>
          </div>
        </section>

        <section className="site-section">
          <div className="site-container">
            <div className="section-heading">
              <p className="site-kicker">ONE LEARNING SYSTEM</p>
              <h2>不是功能拼盤，而是一個可持續的練習循環。</h2>
              <p>每個功能都回到同一件事：找出缺口、提供足夠脈絡、練習、修正，再複習。</p>
            </div>
            <div className="feature-grid">
              {featureCards.map(({ icon: Icon, title, text }, index) => (
                <article className="feature-card" key={title}>
                  <div className="feature-card-top">
                    <span>0{index + 1}</span>
                    <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section level-section">
          <div className="site-container level-layout">
            <div className="section-heading level-copy">
              <p className="site-kicker">A CLEAR PATH</p>
              <h2>程度越高，越需要精確的回饋。</h2>
              <p>
                DeutschTrainer 從 B1 的生活溝通走向 C2
                的修辭與風格，不假裝用同一套題型就能涵蓋所有程度。
              </p>
              <Link className="text-link" href="/features#levels">
                查看各級重點
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <ol className="level-list">
              {levelDetails.map((item) => (
                <li key={item.level}>
                  <strong>{item.level}</strong>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section trust-section">
          <div className="site-container trust-layout">
            <div>
              <p className="site-kicker">TRUST BY DESIGN</p>
              <h2>學習資料是你的，不是展示素材。</h2>
            </div>
            <div className="trust-points">
              <p>
                <ShieldCheck size={21} aria-hidden="true" />
                作文、錄音、逐字稿與學習紀錄依使用者隔離。
              </p>
              <p>
                <PenLine size={21} aria-hidden="true" />
                AI 生成的教學內容必須經人工審核後才能發布。
              </p>
              <p>
                <MessageSquareText size={21} aria-hidden="true" />
                不提供排行榜、好友、公會或即時多人功能。
              </p>
            </div>
          </div>
        </section>

        <section className="site-cta">
          <div className="site-container cta-panel">
            <div>
              <p className="site-kicker">BUILD IN PUBLIC</p>
              <h2>先把連線、安全與實機驗收做對。</h2>
              <p>原始碼、測試與預覽版交付都保留在 GitHub，公開記錄產品目前真正完成的位置。</p>
            </div>
            <a
              className="site-button site-button-light"
              href="https://github.com/EngelN9/deutschtrainer"
            >
              查看 GitHub 專案
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
