import { PublicDocument } from "../../src/components/PublicDocument";

export default function TermsPage() {
  return (
    <PublicDocument
      title="服務條款"
      lead="本頁提供產品使用邊界；正式對外發布前仍須完成法務審閱並加入營運主體與生效日期。"
    >
      <section>
        <h2>服務範圍</h2>
        <p>
          DeutschTrainer
          是德語自學工具，不提供教師認證、考試成績保證、法律或專業建議。功能可依版本、帳號狀態、網路與部署環境而不同。
        </p>
      </section>
      <section>
        <h2>使用者責任</h2>
        <ul>
          <li>保護帳號憑證，不共用或嘗試存取他人資料。</li>
          <li>不以自動化或重播方式濫用昂貴、寫入型或 AI 功能。</li>
          <li>確認 AI 產生或評量內容後再用於重要決定。</li>
        </ul>
      </section>
      <section>
        <h2>離線與 AI 限制</h2>
        <p>
          離線模式只支援已下載內容中的固定題與待同步提交；自由回答、作文、TTS、STT 與其他 AI
          功能需要連線。模擬或測試結果不等同正式服務結果。
        </p>
      </section>
    </PublicDocument>
  );
}
