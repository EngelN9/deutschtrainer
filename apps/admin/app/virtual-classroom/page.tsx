import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocument } from "../../src/components/PublicDocument";
import { getLearnerWebUrl } from "../../src/lib/learnerWebUrl";

export const metadata: Metadata = {
  title: "Virtual Classroom 虛擬教室",
  description:
    "了解 DeutschTrainer AI Virtual Classroom 的即時練習邊界、Email 驗證資格與成本保護。",
  alternates: { canonical: "/virtual-classroom" },
};

export default function VirtualClassroomPage() {
  const learnerWebUrl = getLearnerWebUrl();

  return (
    <PublicDocument
      category="AI Tutor · Virtual Classroom"
      title="Virtual Classroom 虛擬教室"
      lead="用五分鐘完成一輪德語輸出：開口回答、在共享白板看懂修正，再重說一次。"
    >
      <section className="product-status-callout" aria-labelledby="classroom-status-title">
        <p className="public-eyebrow">受限公開測試</p>
        <h2 id="classroom-status-title">瀏覽器即可使用，不需安裝 App</h2>
        <p>目前先開放給已登入並完成 Email 驗證的 learner。麥克風不方便時，也可以選擇文字練習。</p>
      </section>
      <section>
        <h2>一堂課的三個步驟</h2>
        <ol className="classroom-journey">
          <li>
            <span>01</span>
            <div>
              <strong>選擇語音或文字</strong>
              <p>依照當下環境開始，不讓麥克風成為學習阻礙。</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>看懂共享白板</strong>
              <p>德語句型、修正與必要的繁中提示集中在同一個工作區。</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>重說一次</strong>
              <p>把看懂的內容重新輸出，從「知道」走到「真的會用」。</p>
            </div>
          </li>
        </ol>
      </section>
      <section>
        <h2>時間、額度與安全邊界</h2>
        <p>
          頁面倒數讓你掌握進度；真正的 session
          到期與供應商連線中止由伺服器執行。個人或平台額度用完、服務暫停、網路中斷時，系統會拒絕或結束連線。
        </p>
        <div className="document-action-row">
          <a className="button button-primary" href={`${learnerWebUrl}/classroom`}>
            前往虛擬教室
          </a>
          <Link className="inline-action-link" href="/support">
            查看使用支援
          </Link>
        </div>
      </section>
    </PublicDocument>
  );
}
