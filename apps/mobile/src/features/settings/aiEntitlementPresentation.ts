import type { AiEntitlementResponse } from "@deutschtrainer/validation";

type AiQuota = AiEntitlementResponse["quotas"]["writingEvaluation"];

export interface AiFeatureAvailability {
  canUse: boolean;
  message: string;
  tone: "error" | "info";
}

export function resolveAiFeatureAvailability({
  errorMessage,
  featureLabel,
  isLoading,
  quota,
}: {
  errorMessage?: string;
  featureLabel: string;
  isLoading: boolean;
  quota?: AiQuota;
}): AiFeatureAvailability {
  if (isLoading) {
    return { canUse: false, message: `正在確認${featureLabel}資格...`, tone: "info" };
  }
  if (errorMessage) {
    return { canUse: false, message: errorMessage, tone: "error" };
  }
  if (!quota?.enabled) {
    return {
      canUse: false,
      message: `${featureLabel}目前只開放給核准的測試帳號。`,
      tone: "info",
    };
  }
  if (quota.remaining === 0) {
    return {
      canUse: false,
      message: quota.resetsAt
        ? `${featureLabel}額度已用完，將於 ${formatQuotaReset(quota.resetsAt)} 起逐次恢復。`
        : `${featureLabel}額度已用完，請稍後再試。`,
      tone: "error",
    };
  }
  return {
    canUse: true,
    message: `${featureLabel}測試資格已確認，剩餘 ${quota.remaining} / ${quota.limit} 次。`,
    tone: "info",
  };
}

export function formatQuotaReset(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
