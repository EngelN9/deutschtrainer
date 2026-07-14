import { describe, expect, it } from "@jest/globals";
import {
  apiErrorResponseSchema,
  completeReviewRequestSchema,
  courseListResponseSchema,
  evaluateResponseRequestSchema,
  evaluateWritingRequestSchema,
  fixedExerciseSchema,
  generateExerciseDraftRequestSchema,
  learningRecordSnapshotSchema,
  onboardingRequestSchema,
  submitAttemptRequestSchema,
  submitDictationRequestSchema,
  textToSpeechRequestSchema,
  transcribeRequestSchema,
} from "./index";

describe("generateExerciseDraftRequestSchema", () => {
  it("accepts a constrained admin generation brief", () => {
    const result = generateExerciseDraftRequestSchema.parse({
      activityId: "1103f461-2efe-46c2-a238-00b310037494",
      level: "B2",
      type: "multiple_choice",
      topicZhTw: "正式職場溝通",
      targetSkillIds: ["B2.register.formal"],
      instructionsZhTw: "答案必須明確。",
      orderIndex: 20,
      idempotencyKey: "phase8-generation-contract",
    });

    expect(result.type).toBe("multiple_choice");
  });

  it("rejects unsupported AI draft exercise types", () => {
    const result = generateExerciseDraftRequestSchema.safeParse({
      activityId: "1103f461-2efe-46c2-a238-00b310037494",
      level: "B2",
      type: "essay",
      topicZhTw: "正式職場溝通",
      targetSkillIds: ["B2.register.formal"],
      instructionsZhTw: "",
      orderIndex: 20,
      idempotencyKey: "phase8-generation-contract",
    });

    expect(result.success).toBe(false);
  });
});

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
      answer: "weil ich Deutsch lerne",
      durationMs: 2000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "short",
    });

    expect(result.success).toBe(false);
  });

  it("accepts raw fixed answers but rejects client-authored scores", () => {
    const valid = submitAttemptRequestSchema.safeParse({
      exerciseId: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      answer: "weil",
      durationMs: 2000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase9-server-grading",
    });
    const forged = submitAttemptRequestSchema.safeParse({
      exerciseId: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      answer: "denn",
      durationMs: 2000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase9-forged-grading",
      score: 100,
      isCorrect: true,
    });

    expect(valid.success).toBe(true);
    expect(forged.success).toBe(false);
  });

  it("accepts API catalog and review completion contracts", () => {
    const catalog = courseListResponseSchema.parse({ source: "api", courses: [] });
    const review = completeReviewRequestSchema.parse({
      answer: "weil",
      durationMs: 1000,
      usedHint: false,
      idempotencyKey: "phase9-review-contract",
    });

    expect(catalog.source).toBe("api");
    expect(review.answer).toBe("weil");
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

  it("accepts PostgreSQL UUIDs in a learning-record snapshot", () => {
    const parsed = learningRecordSnapshotSchema.parse({
      attempts: [
        {
          id: "cea085c4-11cd-4dcd-b852-70db65caaeb4",
          userId: "1d377460-50a3-4c7b-97f6-5d0a6d72e5ce",
          exerciseId: "bbd6554d-7c7f-0909-d72a-106769464259",
          lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
          submittedAt: "2026-07-13T03:22:15.000+00:00",
          score: 0,
          isCorrect: false,
          durationMs: 5000,
          usedHint: false,
          mode: "lesson",
          idempotencyKey: "phase4-attempt-test",
        },
      ],
      errors: [],
      mastery: [],
      reviews: [],
      lessonProgress: [],
      skillNames: {},
    });

    expect(parsed.attempts[0]?.lessonId).toBe("7201fcca-f0c9-9bb7-218a-192849e5f84d");
  });

  it("accepts PostgreSQL UUIDs in an AI evaluation request", () => {
    const parsed = evaluateResponseRequestSchema.parse({
      exerciseId: "ce5a2fd6-18ef-95ba-f141-3530ba85a56a",
      responseDe: "Obwohl es regnet, fahre ich zur Arbeit.",
      durationMs: 12_000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase5-evaluation-test",
      reviewId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
    });

    expect(parsed.exerciseId).toBe("ce5a2fd6-18ef-95ba-f141-3530ba85a56a");
  });

  it("validates a server-trusted writing request and rejects short replay keys", () => {
    const result = evaluateWritingRequestSchema.safeParse({
      promptId: "ced48daf-53ab-d040-93ea-85190838c379",
      textDe: "Sehr geehrte Frau Berger, ich kann nächste Woche leider nicht teilnehmen.",
      durationMs: 30_000,
      idempotencyKey: "short",
    });

    expect(result.success).toBe(false);
  });

  it("accepts asset-based TTS requests without accepting arbitrary text", () => {
    const parsed = textToSpeechRequestSchema.parse({
      listeningAssetId: "ced48daf-53ab-d040-93ea-85190838c379",
      voice: "marin",
      idempotencyKey: "phase7-tts-test-key",
    });

    expect(parsed).not.toHaveProperty("text");
  });

  it("rejects speaking storage paths outside an auth-user UUID folder", () => {
    const result = transcribeRequestSchema.safeParse({
      speakingPromptId: "ced48daf-53ab-d040-93ea-85190838c379",
      storagePath: "shared/recording.webm",
      mimeType: "audio/webm",
      durationMs: 12_000,
      idempotencyKey: "phase7-speaking-test",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty dictation submissions before protected scoring", () => {
    const result = submitDictationRequestSchema.safeParse({
      listeningAssetId: "ced48daf-53ab-d040-93ea-85190838c379",
      sessionKey: "phase7-listening-session",
      textDe: "   ",
      comprehensionAnswer: "a",
      playCount: 1,
      usedSlowSpeed: false,
      idempotencyKey: "phase7-listening-submit",
    });

    expect(result.success).toBe(false);
  });
});
