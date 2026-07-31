import { PublicDocument } from "../../src/components/PublicDocument";

export default function AccountDeletionPage() {
  return (
    <PublicDocument
      title="帳號與資料刪除"
      lead="帳號刪除是不可逆操作，必須由已登入的帳號本人明確確認。"
    >
      <section>
        <h2>刪除範圍</h2>
        <p>
          完整流程應清除私人 Storage、作文、錄音、轉錄與回饋、學習紀錄、偏好、profile、Auth
          user、session、裝置快取與待同步佇列。依法或為安全稽核需保留的最小紀錄不得包含原始私人內容。
        </p>
      </section>
      <section>
        <h2>如何提出</h2>
        <p>
          連線版 App
          的設定頁必須提供明確破壞性確認，並在伺服器完成刪除後清除本機資料。在該流程通過遠端與實機驗收前，本頁不會宣稱正式刪除服務已上線。
        </p>
      </section>
      <section>
        <h2>裝置上的資料</h2>
        <p>
          若只使用 Demo，資料可能僅存在裝置上。清除 App
          資料或解除安裝可移除該裝置上的資料；這不會代替連線帳號的伺服器刪除流程。
        </p>
      </section>
    </PublicDocument>
  );
}
