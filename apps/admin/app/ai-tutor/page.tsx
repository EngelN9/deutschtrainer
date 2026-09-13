import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocument } from "../../src/components/PublicDocument";

export const metadata: Metadata = {
  title: "AI 德語家教",
  description: "了解 DeutschTrainer AI 的寫作、聽力與口說輔助功能，以及 Email 驗證與公開測試額度。",
  alternates: { canonical: "/ai-tutor" },
};

export default function AiTutorPage() {
  return (
    <PublicDocument
      title="AI 德語家教"
      lead="以繁體中文理解德語輸出練習；AI 回饋是學習輔助，不取代教師或考試認證。"
    >
      <section>
        <h2>適用的學習情境</h2>
        <p>
          已連線的帳號可在支援的練習中取得寫作評量、聽力輔助或口說逐字稿相關回饋。每項功能都有資料格式、逾時與使用額度限制，服務可能暫停或調整。
        </p>
      </section>
      <section>
        <h2>帳號與使用資格</h2>
        <p>
          匿名試用可使用非 AI 的固定題課程。AI 功能只提供給已登入、完成 Email 驗證的 learner
          帳號，且仍受伺服器端功能開關、個人額度與平台每日 provider 呼叫上限保護。
        </p>
      </section>
      <section>
        <h2>目前狀態</h2>
        <p>AI 功能目前屬於受限測試範圍。不要將 AI 回饋視為教師認證、精確發音分數或絕對正確答案。</p>
        <Link className="inline-action-link" href="/privacy">
          查看隱私說明
        </Link>
      </section>
    </PublicDocument>
  );
}
