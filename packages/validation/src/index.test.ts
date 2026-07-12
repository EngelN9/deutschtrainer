import { describe, expect, it } from "@jest/globals";
import {
  apiErrorResponseSchema,
  fixedExerciseSchema,
  onboardingRequestSchema,
  submitAttemptRequestSchema,
} from "./index";

describe("validation schemas", () => {
  it("accepts the unified API error format", () => {
    const parsed = apiErrorResponseSchema.parse({
      error: {
        code: "AI_RESPONSE_INVALID",
        message: "無法解析 AI 回應。",
        retryable: true,
        requestId: "req_test",
      },
    });

    expect(parsed.error.retryable).toBe(true);
  });

  it("rejects short idempotency keys for attempts", () => {
    const result = submitAttemptRequestSchema.safeParse({
      exerciseId: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      lessonId: "61a33427-3d02-4b0c-9bb8-4da705e50313",
      answer: "weil ich Deutsch lerne",
      durationMs: 2000,
      usedHint: false,
      idempotencyKey: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects onboarding when target level is below current level", () => {
    const result = onboardingRequestSchema.safeParse({
      currentLevel: "C1",
      targetLevel: "B2",
      dailyMinutes: 30,
      learningGoals: ["work"],
      notificationsEnabled: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a fixed exercise without a usable answer", () => {
    const result = fixedExerciseSchema.safeParse({
      id: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      level: "B1",
      type: "fill_blank",
      title: "連接詞填空",
      instructionZhTw: "填入正確答案。",
      promptDe: "Ich bleibe zu Hause, ___ es regnet.",
      skillIds: [],
      grammarTopicIds: [],
      vocabularyIds: [],
      estimatedSeconds: 30,
      difficulty: 2,
      sourceType: "human",
      reviewStatus: "approved",
      version: 1,
      answer: { acceptedAnswers: [] },
      gradingPolicy: {
        acceptedAlternatives: [],
        allowPartialCredit: false,
        caseSensitive: false,
        ignorePunctuation: true,
        normalizeGermanCharacters: true,
      },
    });

    expect(result.success).toBe(false);
  });
});
