import { CheckCircle2, Clock3, LockKeyhole, MinusCircle } from "lucide-react";

export type AvailabilityTone = "available" | "conditional" | "planned" | "unavailable";

export interface FeatureAvailability {
  label: string;
  tone: AvailabilityTone;
}

export interface Feature {
  name: string;
  web: FeatureAvailability;
  requirement: string;
}

interface FeatureMatrixProps {
  features: Feature[];
  ariaLabel?: string;
}

const statusIcons = {
  available: CheckCircle2,
  conditional: LockKeyhole,
  planned: Clock3,
  unavailable: MinusCircle,
} as const;

function AvailabilityBadge({ availability }: { availability: FeatureAvailability }) {
  const Icon = statusIcons[availability.tone];
  return (
    <span className={`availability-badge availability-${availability.tone}`}>
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
      {availability.label}
    </span>
  );
}

export function FeatureMatrix({ features, ariaLabel = "目前功能與使用條件" }: FeatureMatrixProps) {
  return (
    <section
      className="public-section public-feature-matrix"
      aria-labelledby="feature-matrix-title"
    >
      <div className="public-section-heading compact">
        <p className="public-eyebrow">公開測試範圍</p>
        <h2 id="feature-matrix-title">先看清楚功能現在如何使用。</h2>
        <p>可用性仍受帳號狀態、服務開關、網路與每日配額影響；最新狀態以狀態頁為準。</p>
      </div>
      <div className="feature-matrix-scroll" role="region" aria-label={ariaLabel} tabIndex={0}>
        <table className="feature-matrix">
          <caption className="sr-only">DeutschTrainer 目前網頁功能與使用條件</caption>
          <thead>
            <tr>
              <th scope="col">功能</th>
              <th scope="col">目前網頁版</th>
              <th scope="col">使用條件</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.name}>
                <th scope="row">{feature.name}</th>
                <td>
                  <AvailabilityBadge availability={feature.web} />
                </td>
                <td>{feature.requirement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const defaultFeatures: Feature[] = [
  {
    name: "固定題練習與複習",
    web: { label: "可使用", tone: "available" },
    requirement: "匿名試用可進入；同步與跨裝置紀錄需要帳號。",
  },
  {
    name: "AI 寫作與口說輔助",
    web: { label: "受限測試", tone: "conditional" },
    requirement: "需要已驗證 learner 帳號，並受功能開關與每日配額限制。",
  },
  {
    name: "Virtual Classroom",
    web: { label: "受限測試", tone: "conditional" },
    requirement: "需要已驗證 learner 帳號；服務與全域名額可能暫停。",
  },
  {
    name: "離線課程下載",
    web: { label: "網頁版未提供", tone: "unavailable" },
    requirement: "需要未來的原生 App 與完成實機驗收的發行版本。",
  },
];
