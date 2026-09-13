import { describe, expect, it } from "@jest/globals";
import { resolveAiFeatureAvailability } from "./aiEntitlementPresentation";

describe("resolveAiFeatureAvailability", () => {
  it("fails closed while entitlement is loading or unavailable", () => {
    expect(
      resolveAiFeatureAvailability({ featureLabel: "作文 AI 批改", isLoading: true }),
    ).toMatchObject({ canUse: false, tone: "info" });
    expect(
      resolveAiFeatureAvailability({
        errorMessage: "無法讀取 AI 資格。",
        featureLabel: "作文 AI 批改",
        isLoading: false,
      }),
    ).toEqual({ canUse: false, message: "無法讀取 AI 資格。", tone: "error" });
  });

  it("distinguishes restricted, exhausted, and available features", () => {
    const baseQuota = { limit: 2, used: 0, remaining: 2, resetsAt: null };
    expect(
      resolveAiFeatureAvailability({
        featureLabel: "錄音 AI 分析",
        isLoading: false,
        quota: { ...baseQuota, enabled: false },
      }),
    ).toMatchObject({ canUse: false, tone: "info" });
    expect(
      resolveAiFeatureAvailability({
        featureLabel: "錄音 AI 分析",
        isLoading: false,
        quota: { ...baseQuota, enabled: true, used: 2, remaining: 0 },
      }),
    ).toMatchObject({ canUse: false, tone: "error" });
    expect(
      resolveAiFeatureAvailability({
        featureLabel: "錄音 AI 分析",
        isLoading: false,
        quota: { ...baseQuota, enabled: true, used: 1, remaining: 1 },
      }),
    ).toMatchObject({ canUse: true, tone: "info" });
  });
});
