import { describe, expect, it } from "@jest/globals";
import { SupabaseAiQuotaGate } from "./supabaseAiQuotaGate";

const verifiedLearner = {
  emailVerified: true,
  profileId: "00000000-0000-4000-8000-000000000001",
  role: "learner" as const,
};

describe("SupabaseAiQuotaGate eligibility", () => {
  it("rejects all public AI calls while the emergency switch is disabled", () => {
    const gate = createGate({ publicEnabled: false });

    expect(
      captureError(() => gate.assertEligible(verifiedLearner, "evaluate_writing")),
    ).toMatchObject({
      code: "AI_GLOBALLY_DISABLED",
      status: 503,
    });
  });

  it("rejects a feature that is not enabled for the beta", () => {
    const gate = createGate();

    expect(
      captureError(() => gate.assertEligible(verifiedLearner, "text_to_speech")),
    ).toMatchObject({ code: "AI_FEATURE_DISABLED", status: 503 });
  });

  it("requires an email-verified learner profile", () => {
    const gate = createGate();

    expect(
      captureError(() =>
        gate.assertEligible({ ...verifiedLearner, emailVerified: false }, "evaluate_writing"),
      ),
    ).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(
      captureError(() =>
        gate.assertEligible({ ...verifiedLearner, role: "content_editor" }, "evaluate_writing"),
      ),
    ).toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("allows only an approved learner to use an enabled feature", () => {
    const gate = createGate();

    expect(() => gate.assertEligible(verifiedLearner, "evaluate_writing")).not.toThrow();
    expect(() => gate.assertEligible(verifiedLearner, "transcribe_audio")).not.toThrow();
    expect(
      captureError(() =>
        gate.assertEligible(
          { ...verifiedLearner, profileId: "00000000-0000-4000-8000-000000000099" },
          "evaluate_writing",
        ),
      ),
    ).toMatchObject({ code: "AI_ACCESS_RESTRICTED", status: 403 });
  });
});

function createGate({ publicEnabled = true }: { publicEnabled?: boolean } = {}) {
  return new SupabaseAiQuotaGate("http://127.0.0.1:54321", "test-service-role", {
    publicEnabled,
    enabledFeatures: new Set(["evaluate_writing", "transcribe_audio"]),
    allowedProfileIds: new Set([verifiedLearner.profileId]),
    globalDailyProviderCallLimit: 10,
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
