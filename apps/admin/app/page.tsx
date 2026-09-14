import { ArrowRight, CircleDot } from "lucide-react";
import Link from "next/link";
import { FeatureMatrix, defaultFeatures } from "../src/components/FeatureMatrix";
import { LearningLoop } from "../src/components/LearningLoop";
import { PillarGrid } from "../src/components/PillarGrid";
import { PublicShell } from "../src/components/PublicShell";
import { TrustBand } from "../src/components/TrustBand";
import { getLearnerWebUrl } from "../src/lib/learnerWebUrl";

export const metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const learnerWebUrl = getLearnerWebUrl();

  return (
    <PublicShell>
      <section className="public-hero" aria-labelledby="public-home-title">
        <p className="public-eyebrow">B1–C2 · 繁體中文德語自學</p>
        <h1 id="public-home-title">讓每一次德語練習，都累積成下一次的進步。</h1>
        <p className="public-hero-lead">
          DeutschTrainer AI
          將固定題、寫作練習、錯誤分析與間隔複習整理成清楚路徑，協助繁體中文學習者建立可長期保留的進階德語能力。
        </p>
        <div className="public-actions">
          <a className="button button-primary public-primary-cta" href={learnerWebUrl}>
            <span>開始使用 Web 版</span>
            <ArrowRight size={17} aria-hidden="true" />
          </a>
          <Link className="button button-secondary" href="/learn-german-b1-c2">
            探索 B1–C2 學習路徑
          </Link>
        </div>
        <ul className="public-hero-meta" aria-label="產品重點">
          <li>
            <CircleDot size={15} aria-hidden="true" />
            匿名即可試用固定題
          </li>
          <li>
            <CircleDot size={15} aria-hidden="true" />
            AI 與教室需要已驗證帳號
          </li>
          <li>
            <CircleDot size={15} aria-hidden="true" />
            公開受限測試
          </li>
        </ul>
      </section>

      <PillarGrid />
      <LearningLoop />
      <FeatureMatrix features={defaultFeatures} />
      <TrustBand variant="beta" />

      <section className="public-section public-principles" aria-labelledby="principles-title">
        <div className="public-section-heading compact">
          <p className="public-eyebrow">產品承諾</p>
          <h2 id="principles-title">功能邊界與學習紀錄，都應該說得明白。</h2>
        </div>
        <div className="public-grid">
          <article>
            <h3>內容狀態不混淆</h3>
            <p>只有完成審核與發布流程的教材，才會被描述為正式學習內容。</p>
          </article>
          <article>
            <h3>進度來自正式提交</h3>
            <p>熟練度、錯誤紀錄與複習排程依伺服器確認的作答結果更新。</p>
          </article>
          <article>
            <h3>限制直接告訴你</h3>
            <p>離線、AI、帳號與測試階段的限制清楚呈現，不以模擬結果冒充正式服務。</p>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
