import type { Metadata } from "next";
import {
  AudioLines,
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  CloudDownload,
  Languages,
  PenLine,
  Repeat2,
} from "lucide-react";
import { PublicPage } from "../../src/components/PublicShell";

export const metadata: Metadata = {
  title: "功能與程度",
  description: "了解 DeutschTrainer 的 B1–C2 課程、AI 診斷、複習、寫作、聽力、口說與離線學習功能。",
};

const capabilities = [
  {
    icon: BookOpenCheck,
    title: "能力導向課程",
    text: "課程地圖、單元、課堂與題目以 CEFR 能力與技能標籤串接，支援 B1、B2、C1、C2。",
  },
  {
    icon: Languages,
    title: "繁中知識庫",
    text: "可搜尋的單字與文法主題包含德語例句、語域、地區差異、常見錯誤與相關練習。",
  },
  {
    icon: BrainCircuit,
    title: "結構化 AI 回饋",
    text: "翻譯、自由作答與寫作回饋採結構化輸出、錯誤分類、成本紀錄與每人使用限制。",
  },
  {
    icon: Repeat2,
    title: "錯題與間隔複習",
    text: "保留作答歷史、能力掌握度與到期複習項目，完成後再計算下一次複習時間。",
  },
  {
    icon: PenLine,
    title: "寫作中心",
    text: "B1–C2 分級題目、不可變版本、十面向評分、逐句診斷、改寫與版本比較。",
  },
  {
    icon: AudioLines,
    title: "聽力與口說",
    text: "TTS、慢速播放、聽寫、理解題、私人錄音、轉錄、語速與長停頓提示。",
  },
  {
    icon: CloudDownload,
    title: "下載與離線同步",
    text: "課程快照會先驗證再保存；固定題可離線評分，待連線後以冪等請求同步。",
  },
  {
    icon: ChartNoAxesCombined,
    title: "學習分析與提醒",
    text: "查看技能掌握、錯誤類型與時間趨勢，並以時區感知的本機通知維持節奏。",
  },
];

const levels = [
  {
    level: "B1",
    outcome: "生活情境中清楚表達",
    examples: "租屋、就醫、旅行、經驗描述、正式與非正式電子郵件",
  },
  {
    level: "B2",
    outcome: "組織觀點並理解較複雜內容",
    examples: "職場協作、新聞閱讀、論證、社會議題與長篇敘述",
  },
  {
    level: "C1",
    outcome: "自然、精確地處理抽象主題",
    examples: "學術寫作、摘要、正式簡報、語域選擇與複雜句型",
  },
  {
    level: "C2",
    outcome: "掌握細微語意、修辭與風格",
    examples: "高階議論文、諷刺分析、批判性閱讀與專業編輯",
  },
];

export default function FeaturesPage() {
  return (
    <PublicPage
      kicker="PRODUCT CAPABILITIES"
      title="把理解、輸出、修正與複習放在同一個系統。"
      intro="DeutschTrainer 的第一版聚焦德語 B1–C2。沒有排行榜、虛擬貨幣、好友或即時多人；每一項功能都服務於可驗證的語言能力進步。"
    >
      <section className="page-section">
        <h2>學習功能</h2>
        <div className="capability-grid">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section" id="levels">
        <div className="page-section-heading">
          <h2>B1–C2 程度重點</h2>
          <p>內容量會逐步增加，但資料模型、導覽、知識庫與評分契約從第一版就支援四個程度。</p>
        </div>
        <div className="level-table" role="table" aria-label="B1 到 C2 程度重點">
          {levels.map((item) => (
            <div className="level-table-row" role="row" key={item.level}>
              <strong role="cell">{item.level}</strong>
              <div role="cell">
                <h3>{item.outcome}</h3>
                <p>{item.examples}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section product-boundary" id="android">
        <p className="site-kicker">DELIVERY STATUS</p>
        <h2>目前可使用的成品邊界</h2>
        <dl>
          <div>
            <dt>Android 離線 Demo</dt>
            <dd>可直接安裝、無需帳號，用於課程與固定題型展示；不是連線正式版。</dd>
          </div>
          <div>
            <dt>Android 連線 Preview</dt>
            <dd>
              接上遠端 Supabase 與 HTTPS API 後，需完成登入、AI、音訊、離線重連與刪除實機驗收。
            </dd>
          </div>
          <div>
            <dt>公開網站</dt>
            <dd>產品、支援、法律與下載狀態不需登入；不載入內容管理程式碼。</dd>
          </div>
          <div>
            <dt>內容管理後台</dt>
            <dd>位於獨立 `/admin` 路徑，登入後由伺服器與資料庫雙重驗證內容團隊角色。</dd>
          </div>
        </dl>
        <a
          className="site-button site-button-primary"
          href="https://github.com/EngelN9/deutschtrainer/releases"
        >
          查看 GitHub Releases
        </a>
      </section>
    </PublicPage>
  );
}
