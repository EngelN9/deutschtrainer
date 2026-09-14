import { ShieldCheck } from "lucide-react";

export type TrustVariant = "ai" | "privacy" | "beta" | "quota";

interface TrustBandProps {
  variant: TrustVariant;
}

const messages: Record<TrustVariant, { title: string; description: string }> = {
  ai: {
    title: "AI 回饋保留清楚邊界",
    description: "AI 可能出錯，只作為學習輔助，不代表教師認證、精確發音分數或正式檢定結果。",
  },
  privacy: {
    title: "私人內容只在必要範圍內處理",
    description: "作文、錄音與學習資料依功能需要由受保護的服務處理；請先閱讀隱私與刪除說明。",
  },
  beta: {
    title: "目前是公開、受配額限制的測試版本",
    description: "實際可用性由帳號資格、服務開關、供應商狀態與平台每日上限共同決定。",
  },
  quota: {
    title: "昂貴功能由伺服器控制額度",
    description: "個人與平台上限都在伺服器端判定；額度用盡時，系統會清楚說明何時可以再試。",
  },
};

export function TrustBand({ variant }: TrustBandProps) {
  const message = messages[variant];

  return (
    <aside className={`public-trust-band trust-band-${variant}`} aria-label={message.title}>
      <ShieldCheck size={24} strokeWidth={1.8} aria-hidden="true" />
      <div>
        <h2>{message.title}</h2>
        <p>{message.description}</p>
      </div>
    </aside>
  );
}
