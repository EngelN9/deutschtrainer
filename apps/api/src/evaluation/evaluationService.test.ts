import { describe, expect, it, jest } from "@jest/globals";
import type { AiEvaluationFeedback } from "@deutschtrainer/ai-schemas";
import type { EvaluateResponseRequest } from "@deutschtrainer/validation";
import { ResponseEvaluationService } from "./evaluationService";
import { EvaluationProviderError, UnavailableEvaluationProvider } from "./openAiEvaluationProvider";
import type {
  EvaluationExercise,
  EvaluationProvider,
  EvaluationRepository,
  ProviderEvaluationResult,
  UsageLogInput,
} from "./types";

const exercise: EvaluationExercise = {
  id: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
  lessonId: "61a33427-3d02-4b0c-9bb8-4da705e50313",
  version: 1,
  type: "free_response",
  level: "B2",
  instructionZhTw: "以德語說明立場。",
  promptDe: "Sollten Unternehmen mehr Homeoffice ermöglichen?",
  skillIds: ["B2.argumentation.counterargument"],
  referenceAnswersDe: ["Unternehmen sollten mehr Homeoffice ermöglichen."],
  gradingNotesZhTw: "檢查論點與反方回應。",
  minimumCharacters: 10,
  maximumCharacters: 800,
};

const request: EvaluateResponseRequest = {
  exerciseId: exercise.id,
  responseDe: "Unternehmen sollten mehr Homeoffice ermöglichen, weil es flexibel ist.",
  durationMs: 12_000,
  usedHint: false,
  mode: "lesson",
  idempotencyKey: "phase5-evaluation-test",
};

const feedback: AiEvaluationFeedback = {
  isCorrect: true,
  score: 88,
  cefrLevelEstimate: "B2",
  correctedText: request.responseDe,
  errors: [],
  strengths: ["立場清楚。"],
  suggestions: ["可加入反方觀點。"],
  naturalAlternative: "Mehr Homeoffice würde vielen Beschäftigten größere Flexibilität bieten.",
  requiresHumanReview: false,
};

describe("ResponseEvaluationService", () => {
  it("records schema-validated feedback and usage", async () => {
    const usage: UsageLogInput[] = [];
    const recordEvaluation = jest.fn(async () => ({
      attemptId: "b446e54a-864d-47a9-a563-e1f1af535774",
      feedbackId: "cc531f79-6c7c-4520-9249-56f98f868987",
      completionPercent: 50,
      idempotentReplay: false,
    }));
    const provider = createProvider([{ payload: feedback }]);
    const repository = createRepository({
      recordEvaluation,
      recordUsage: async (entry) => {
        usage.push(entry);
      },
    });
    const service = createService(repository, provider);

    const result = await service.evaluate("valid-token", request);

    expect(result.status).toBe("completed");
    expect(result.feedback.score).toBe(88);
    expect(result.completionPercent).toBe(50);
    expect(recordEvaluation).toHaveBeenCalledTimes(1);
    expect(usage).toHaveLength(1);
    expect(usage[0]?.success).toBe(true);
    expect(usage[0]?.logicalRequest).toBe(true);
  });

  it("retries once when business validation rejects a skill", async () => {
    const usage: UsageLogInput[] = [];
    const invalidFeedback = {
      ...feedback,
      isCorrect: false,
      score: 60,
      errors: [
        {
          type: "word_order",
          severity: "major",
          original: "weil ich muss arbeiten",
          correction: "weil ich arbeiten muss",
          explanationZhTw: "從句動詞應放在句尾。",
          relatedSkillId: "B1.unrelated.skill",
          grammarTopicId: null,
          vocabularyId: null,
        },
      ],
    };
    const provider = createProvider([{ payload: invalidFeedback }, { payload: feedback }]);
    const repository = createRepository({
      recordUsage: async (entry) => {
        usage.push(entry);
      },
    });
    const service = createService(repository, provider);

    const result = await service.evaluate("valid-token", request);

    expect(result.status).toBe("completed");
    expect(provider.evaluate).toHaveBeenCalledTimes(2);
    expect(usage.map((entry) => entry.success)).toEqual([false, true]);
    expect(usage[0]?.errorCode).toBe("AI_RESPONSE_INVALID");
  });

  it("uses a learner-scoped cache without calling the provider", async () => {
    const provider = createProvider([]);
    const repository = createRepository({
      findCached: async () => ({
        feedbackId: "a2b14e13-4f0c-43be-9356-c656a51e38b5",
        feedback,
        model: "cached-model",
      }),
    });
    const service = createService(repository, provider);

    const result = await service.evaluate("valid-token", request);

    expect(result.cached).toBe(true);
    expect(result.model).toBe("cached-model");
    expect(provider.evaluate).not.toHaveBeenCalled();
  });

  it("rejects requests after the rolling daily limit", async () => {
    const service = createService(
      createRepository({ countRecentLogicalRequests: async () => 20 }),
      createProvider([{ payload: feedback }]),
    );

    await expect(service.evaluate("valid-token", request)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("returns a non-persisted fallback when OpenAI is not configured", async () => {
    const recordEvaluation = jest.fn(async () => ({
      attemptId: "unused",
      feedbackId: "unused",
      completionPercent: 0,
      idempotentReplay: false,
    }));
    const service = createService(
      createRepository({ recordEvaluation }),
      new UnavailableEvaluationProvider("gpt-test"),
    );

    const result = await service.evaluate("valid-token", request);

    expect(result.status).toBe("fallback");
    expect(result.attemptId).toBeNull();
    expect(result.fallbackReason).toBe("AI_NOT_CONFIGURED");
    expect(recordEvaluation).not.toHaveBeenCalled();
  });

  it("does not persist feedback after two provider timeouts", async () => {
    const recordEvaluation = jest.fn(async () => ({
      attemptId: "unused",
      feedbackId: "unused",
      completionPercent: 0,
      idempotentReplay: false,
    }));
    const timeout = new EvaluationProviderError("AI_TIMEOUT", "timeout", true);
    const provider = createProvider([{ error: timeout }, { error: timeout }]);
    const service = createService(createRepository({ recordEvaluation }), provider);

    const result = await service.evaluate("valid-token", request);

    expect(result.status).toBe("fallback");
    expect(result.fallbackReason).toBe("AI_TIMEOUT");
    expect(provider.evaluate).toHaveBeenCalledTimes(2);
    expect(recordEvaluation).not.toHaveBeenCalled();
  });
});

function createService(repository: EvaluationRepository, provider: EvaluationProvider) {
  return new ResponseEvaluationService({
    repository,
    provider,
    dailyLimit: 20,
    inputCostPerMillion: 1,
    outputCostPerMillion: 6,
    now: () => new Date("2026-07-13T05:00:00.000Z"),
    requestId: () => "request-test",
  });
}

function createRepository(overrides: Partial<EvaluationRepository> = {}): EvaluationRepository {
  return {
    authenticate: async () => ({
      authUserId: "6926ef44-fbb0-405e-9cb6-4b6fca31a238",
      profileId: "6684e3c2-2cf5-4721-9009-b24405c981c3",
      timezone: "Asia/Taipei",
    }),
    findByIdempotency: async () => undefined,
    findCached: async () => undefined,
    getExercise: async () => exercise,
    countRecentLogicalRequests: async () => 0,
    recordEvaluation: async () => ({
      attemptId: "b446e54a-864d-47a9-a563-e1f1af535774",
      feedbackId: "cc531f79-6c7c-4520-9249-56f98f868987",
      completionPercent: 50,
      idempotentReplay: false,
    }),
    recordUsage: async () => undefined,
    ...overrides,
  };
}

function createProvider(
  outcomes: Array<{ payload?: unknown; error?: EvaluationProviderError }>,
): EvaluationProvider & { evaluate: jest.MockedFunction<EvaluationProvider["evaluate"]> } {
  let index = 0;
  const evaluate = jest.fn(async (): Promise<ProviderEvaluationResult> => {
    const outcome = outcomes[index];
    index += 1;
    if (!outcome) {
      throw new Error("Unexpected provider call");
    }
    if (outcome.error) {
      throw outcome.error;
    }
    return {
      payload: outcome.payload,
      model: "gpt-test",
      providerRequestId: `provider-${index}`,
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 25,
    };
  });
  return { model: "gpt-test", configured: true, evaluate };
}
