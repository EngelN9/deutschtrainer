import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocument } from "../../src/components/PublicDocument";

export const metadata: Metadata = {
  title: "Virtual Classroom 虛擬教室",
  description:
    "了解 DeutschTrainer AI Virtual Classroom 的即時練習邊界、Email 驗證資格與成本保護。",
  alternates: { canonical: "/virtual-classroom" },
};

export default function VirtualClassroomPage() {
  return (
    <PublicDocument
      title="Virtual Classroom 虛擬教室"
      lead="在受限測試下進行即時德語練習，並以伺服器端時長、個人額度與平台上限控制成本。"
    >
      <section>
        <h2>即時練習的邊界</h2>
        <p>
          虛擬教室會建立一個可被伺服器結束的即時連線。客戶端倒數只提供使用者提示；真正的 session
          到期、供應商 hang-up 與重試清理都在伺服器端執行。
        </p>
      </section>
      <section>
        <h2>資格與額度</h2>
        <p>
          匿名身份不能使用即時教室。公開測試目標是已完成 Email 驗證的 learner，每位 learner 在滾動
          24 小時內最多一堂五分鐘課程，平台每日最多三堂；實際開放仍由伺服器設定決定。
        </p>
      </section>
      <section>
        <h2>目前狀態</h2>
        <p>
          此功能仍在受限測試階段，尚未宣稱為公開、無限制的正式教室服務。網路中斷、供應商逾時或全域額度用盡時，系統會拒絕或結束連線。
        </p>
        <Link className="inline-action-link" href="/support">
          取得支援資訊
        </Link>
      </section>
    </PublicDocument>
  );
}
