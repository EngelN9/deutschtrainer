import type { Metadata } from "next";
import { PublicPage } from "../../src/components/PublicShell";

export const metadata: Metadata = {
  title: "刪除帳號與資料",
  description: "DeutschTrainer 帳號、作文、錄音與學習資料的刪除步驟與範圍。",
};

export default function AccountDeletionPage() {
  return (
    <PublicPage
      kicker="ACCOUNT & DATA DELETION"
      title="刪除帳號與資料"
      intro="個別作文與錄音已有 owner deletion。整個帳號的自助刪除仍在連線 Preview 驗收中，尚未部署成公開功能；本頁先透明列出預定步驟與刪除範圍。"
    >
      <aside className="callout deletion-status">
        <strong>目前狀態：尚未開放整個帳號的自助刪除</strong>
        <p>
          現有 GitHub 離線 Demo 不建立伺服器帳號。連線 Preview 在帳號刪除
          API、本機資料清理與實機驗收完成前，不會公開宣稱此流程可用。
        </p>
      </aside>
      <section className="deletion-steps">
        <h2>預定的 Android App 自助流程</h2>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>登入已開放帳號刪除的連線版</strong>
              <p>離線 Demo 沒有伺服器帳號，因此不會顯示此選項。</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>開啟「個人設定」</strong>
              <p>捲動到「帳號與資料」，選擇「刪除帳號」。</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>閱讀範圍並輸入確認文字</strong>
              <p>App 會再次說明將移除的內容；送出後由 HTTPS API 驗證目前帳號並執行刪除。</p>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <strong>完成登出與本機清理</strong>
              <p>刪除完成後，App 會清除本機 session、設定快取、離線課程與待同步資料。</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>整個帳號流程完成後會刪除的資料</h2>
        <ul>
          <li>Supabase Auth 帳號與個人 profile。</li>
          <li>初次設定、通知偏好、作答、進度、技能掌握、錯題與複習排程。</li>
          <li>作文 submission、版本與回饋。</li>
          <li>口說錄音、音訊 metadata、轉錄與回饋。</li>
          <li>與你的帳號直接關聯的其他私人學習資料。</li>
        </ul>
        <p>
          為防止濫用、資安稽核與成本核對，已去識別化且不再包含正文／錄音的統計或安全紀錄可能保留。
        </p>
      </section>

      <section className="legal-section">
        <h2>只刪除個別內容</h2>
        <p>
          如果你想保留帳號，可在「寫作中心」刪除指定作文，或在「口說」結果頁刪除指定錄音。
          這兩種操作都經 owner 驗證，不會影響其他帳號。
        </p>
      </section>

      <aside className="callout">
        <strong>還無法進入 App？</strong>
        <p>
          請先到<a href="/support">支援頁面</a>回報「無法使用自助刪除」。 不要在公開 Issue
          提供電子郵件、密碼、token 或私人內容；維護者會改用私密方式確認後續。
        </p>
      </aside>
    </PublicPage>
  );
}
