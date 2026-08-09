import { describe, expect, it } from "@jest/globals";
import { SupabaseAiQuotaGate } from "./supabaseAiQuotaGate";

const verifiedLearner = {
  emailVerified: true,
  profileId: "00000000-0000-4000-8000-000000000001",
  role: "learner" as const,
};

describe("SupabaseAiQuotaGate eligibility", () => {
  it("rejects all public AI calls while the emergency switch is disabled", () => {
    const gate = createGate(false);

    expect(captureError(() => gate.assertEligible(verifiedLearner))).toMatchObject({
      code: "AI_GLOBALLY_DISABLED",
      status: 503,
    });
  });

  it("requires an email-verified learner profile", () => {
    const gate = createGate(true);

    expect(
      captureError(() => gate.assertEligible({ ...verifiedLearner, emailVerified: false })),
    ).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(
      captureError(() => gate.assertEligible({ ...verifiedLearner, role: "content_editor" })),
    ).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(() => gate.assertEligible(verifiedLearner)).not.toThrow();
  });
});

function createGate(publicEnabled: boolean) {
  return new SupabaseAiQuotaGate("http://127.0.0.1:54321", "test-service-role", {
    publicEnabled,
    globalDailyProviderCallLimit: 100,
  });
}

function captureError(action: () => void): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected action to throw");
}
