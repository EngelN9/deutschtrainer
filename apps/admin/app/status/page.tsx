import Link from "next/link";
import { PublicDocument } from "../../src/components/PublicDocument";
import {
  formatMergedDate,
  readRepositoryActivity,
  readServiceStatus,
  type ServiceState,
} from "../../src/lib/projectStatus";

// Live enough to be useful, cached enough to stay inside GitHub's unauthenticated rate limit.
export const revalidate = 300;

const learnerWebUrl =
  process.env.NEXT_PUBLIC_LEARNER_WEB_URL?.trim() ||
  "https://deutschtrainer-engeln9-web.onrender.com";

const SERVICE_LABEL: Record<ServiceState, string> = {
  ok: "運作中",
  sleeping: "休眠中，首次連線需要約 30 秒喚醒",
  unreachable: "目前無法連線",
  unconfigured: "尚未設定",
};

export default async function StatusPage() {
  const [service, activity] = await Promise.all([
    readServiceStatus(process.env.NEXT_PUBLIC_API_BASE_URL),
    readRepositoryActivity(),
  ]);

  return (
    <PublicDocument
      title="目前狀態"
      lead="這裡說明現在可以在哪些裝置使用 DeutschTrainer、哪些功能還沒開放，以及最近完成了什麼。"
    >
      <section>
        <h2>怎麼使用</h2>
        <p>
          目前只提供網頁版，用手機或電腦的瀏覽器開啟即可，不需要安裝。
          <Link className="inline-action-link" href={learnerWebUrl}>
            開啟學習網站
          </Link>
          。可以直接試用，不需要註冊；之後若建立帳號，先前的學習紀錄會一併保留。
        </p>
        <p>
          在 iPhone 或 Android 上，可以用瀏覽器的「加入主畫面」把它變成獨立圖示開啟。 Google Play 與
          App Store 尚未上架。
        </p>
      </section>

      <section>
        <h2>功能開放範圍</h2>
        <p>網頁版可用：</p>
        <ul>
          <li>課程、練習與作答批改</li>
          <li>間隔複習與掌握度追蹤</li>
          <li>寫作訓練與版本比較</li>
          <li>聽力練習與口說錄音</li>
        </ul>
        <p>網頁版尚未提供，需要未來的原生 App：</p>
        <ul>
          <li>每日學習提醒通知</li>
          <li>離線下載課程</li>
        </ul>
        <p>AI 批改目前全域關閉，練習與複習不受影響。</p>
      </section>

      <section>
        <h2>服務狀態</h2>
        <ul>
          <li>學習網站：靜態部署，隨時可用。</li>
          <li>學習 API：{SERVICE_LABEL[service.state]}。</li>
          {service.aiPublicEnabled !== null ? (
            <li>AI 功能：{service.aiPublicEnabled ? "已開放" : "未開放"}。</li>
          ) : null}
        </ul>
        <p>
          後端使用免費方案，閒置一段時間後會休眠。第一次連線較慢是正常現象，App 內會顯示喚醒提示。
        </p>
      </section>

      <section>
        <h2>最近完成</h2>
        {activity.changes === null ? (
          <p>目前無法讀取更新紀錄，稍後再試。</p>
        ) : activity.changes.length === 0 ? (
          <p>尚無已合併的更新紀錄。</p>
        ) : (
          <ul>
            {activity.changes.map((change) => (
              <li key={change.number}>
                {formatMergedDate(change.mergedAt)} — {change.title}
              </li>
            ))}
          </ul>
        )}
        {activity.openCount !== null && activity.openCount > 0 ? (
          <p>另有 {activity.openCount} 項變更正在進行中。</p>
        ) : null}
      </section>

      <section>
        <h2>這頁的定位</h2>
        <p>
          目前為公開預覽，用於實際使用與回饋，尚未完成正式發布驗收。內容題數仍在增加中。
          遇到問題請參閱
          <Link className="inline-action-link" href="/support">
            支援
          </Link>
          。
        </p>
      </section>
    </PublicDocument>
  );
}
