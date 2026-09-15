import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="public-footer-wrap">
      <div className="public-footer-inner">
        <div className="public-footer-brand-section">
          <Link className="public-brand footer-brand" href="/" aria-label="DeutschTrainer AI 首頁">
            <span className="brand-mark small" aria-hidden="true">
              DT
            </span>
            <span className="brand-text">
              <strong>DeutschTrainer AI</strong>
              <small>德語 B1–C2 繁中學習平台</small>
            </span>
          </Link>
          <p className="footer-tagline">
            以有脈絡的練習、短文寫作、精確批改與間隔複習，為繁體中文學習者建立可長期保留的德語進階能力。
          </p>
          <div className="footer-beta-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>目前為公開受限測試 (Verified Beta)；離線固定題與需連線 AI 功能嚴格分離。</span>
          </div>
        </div>

        <nav className="public-footer-nav" aria-label="頁尾導覽連結">
          <div className="footer-col">
            <h3 className="footer-col-title">學習路徑</h3>
            <ul>
              <li>
                <Link href="/learn-german-b1-c2">德語 B1–C2 自學</Link>
              </li>
              <li>
                <Link href="/ai-tutor">AI 德語家教</Link>
              </li>
              <li>
                <Link href="/virtual-classroom">Virtual Classroom 虛擬教室</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-col-title">系統與支援</h3>
            <ul>
              <li>
                <Link href="/status">目前狀態與更新</Link>
              </li>
              <li>
                <Link href="/support">取得支援與問題回報</Link>
              </li>
              <li>
                <Link href="/terms">服務條款</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-col-title">隱私與安全</h3>
            <ul>
              <li>
                <Link href="/privacy">隱私權政策</Link>
              </li>
              <li>
                <Link href="/account-deletion">帳號與資料刪除說明</Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="public-footer-bottom">
        <p>© {new Date().getFullYear()} DeutschTrainer AI. 繁體中文德語自學系統. 保留所有權利。</p>
        <p className="footer-disclaimer">
          AI 評量為學習輔助，不構成教師認證、精確發音保證或正式檢定成績承諾。
        </p>
      </div>
    </footer>
  );
}
