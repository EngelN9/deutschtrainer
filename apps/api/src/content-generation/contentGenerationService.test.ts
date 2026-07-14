import { describe, expect, it, jest } from "@jest/globals";
import type { GeneratedExerciseDraft } from "@deutschtrainer/ai-schemas";
import type { GenerateExerciseDraftRequest } from "@deutschtrainer/validation";
import { ContentGenerationService } from "./contentGenerationService";
import type {
  ContentGenerationProvider,
  ContentGenerationRepository,
  PersistedGeneratedExerciseDraft,
  ProviderGenerationResult,
} from "./types";

const request: GenerateExerciseDraftRequest = {
  activityId: "1103f461-2efe-46c2-a238-00b310037494",
  level: "B2",
  type: "multiple_choice",
  topicZhTw: "正式職場溝通",
  targetSkillIds: ["B2.register.formal"],
  instructionsZhTw: "使用清楚且只有一個正確答案的情境。",
  orderIndex: 20,
  idempotencyKey: "phase8-generation-test",
};

const generatedDraft: GeneratedExerciseDraft = {
  type: "multiple_choice",
  titleZhTw: "正式職場提問",
  instructionZhTw: "請選出最合宜的正式說法。",
  promptDe: "Welche Formulierung ist im Beruf angemessen?",
  estimatedSeconds: 60,
  difficulty: 3,
  options: [
    {
      label: "A",
      textDe: "Könnten Sie die Frist bitte erläutern?",
      textZhTw: "您可以說明期限嗎？",
      isCorrect: true,
    },
    {
      label: "B",
      textDe: "Sag mir sofort, wann das fertig sein muss.",
      textZhTw: "立刻告訴我何時要完成。",
      isCorrect: false,
    },
  ],
  acceptedAnswers: [],
  explanationZhTw: null,
  validationNotes: ["需由內容審核者確認語域。"],
  requiresHumanReview: true,
};

describe("ContentGenerationService", () => {
  it("persists a validated AI draft with generated IDs and draft-only state", async () => {
    let stored: PersistedGeneratedExerciseDraft | undefined;
    const repository = createRepository({
      recordDraft: async (_jobId, draft) => {
        stored = draft;
        return recordResult;
      },
    });
    const service = createService(repository, createProvider([generatedDraft]));

    const result = await service.generateExerciseDraft("valid-token", request);

    expect(result).toMatchObject({
      status: "draft",
      reviewStatus: "draft",
      sourceType: "ai_generated",
      idempotentReplay: false,
    });
    expect(stored?.options[0]?.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(stored?.answerJson).toEqual({
      optionId: "00000000-0000-4000-8000-000000000001",
    });
    expect(stored).not.toHaveProperty("status");
  });

  it("rejects reviewers before creating a generation job", async () => {
    const createJob = jest.fn(async () => "unused");
    const repository = createRepository({
      authenticate: async () => ({
        authUserId: "8d30e582-720d-4d23-b930-6146a150729f",
        profileId: "1a6ab2fa-fd01-4790-9d8c-2d676bf2106e",
        role: "reviewer",
      }),
      createJob,
    });
    const service = createService(repository, createProvider([generatedDraft]));

    await expect(service.generateExerciseDraft("valid-token", request)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    expect(createJob).not.toHaveBeenCalled();
  });

  it("retries invalid output and never records a rejected draft", async () => {
    const recordDraft = jest.fn(async () => recordResult);
    const markJobFailed = jest.fn(async () => undefined);
    const provider = createProvider([
      { ...generatedDraft, requiresHumanReview: false },
      { ...generatedDraft, type: "fill_blank" },
    ]);
    const service = createService(createRepository({ recordDraft, markJobFailed }), provider);

    await expect(service.generateExerciseDraft("valid-token", request)).rejects.toMatchObject({
      code: "AI_RESPONSE_INVALID",
    });
    expect(provider.generate).toHaveBeenCalledTimes(2);
    expect(recordDraft).not.toHaveBeenCalled();
    expect(markJobFailed).toHaveBeenCalledWith(
      "5063a6ed-a8b8-4be8-987c-366ff73c2672",
      "AI_RESPONSE_INVALID",
      expect.any(Array),
    );
  });

  it("returns an existing generated draft without calling the provider", async () => {
    const provider = createProvider([]);
    const service = createService(
      createRepository({
        findByIdempotency: async () => ({
          jobId: recordResult.jobId,
          exerciseId: recordResult.exerciseId,
          contentVersionId: recordResult.contentVersionId,
          draft: generatedDraft,
        }),
      }),
      provider,
    );

    const result = await service.generateExerciseDraft("valid-token", request);

    expect(result.idempotentReplay).toBe(true);
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("enforces the rolling generation limit", async () => {
    const createJob = jest.fn(async () => "unused");
    const service = createService(
      createRepository({ countRecentLogicalRequests: async () => 20, createJob }),
      createProvider([generatedDraft]),
    );

    await expect(service.generateExerciseDraft("valid-token", request)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
    expect(createJob).not.toHaveBeenCalled();
  });
});

const recordResult = {
  jobId: "5063a6ed-a8b8-4be8-987c-366ff73c2672",
  exerciseId: "719627f8-f287-42f3-9fc0-95180291ba61",
  contentVersionId: "390a9e8b-1c30-40cd-80a4-14c2a37a353e",
  status: "draft" as const,
  reviewStatus: "draft" as const,
  sourceType: "ai_generated" as const,
};

function createService(
  repository: ContentGenerationRepository,
  provider: ContentGenerationProvider,
) {
  let uuidIndex = 0;
  return new ContentGenerationService({
    repository,
    provider,
    dailyLimit: 20,
    inputCostPerMillion: 1,
    outputCostPerMillion: 6,
    now: () => new Date("2026-07-14T05:00:00.000Z"),
    requestId: () => "phase8-request",
    uuid: () => {
      uuidIndex += 1;
      return `00000000-0000-4000-8000-${String(uuidIndex).padStart(12, "0")}`;
    },
  });
}

function createRepository(
  overrides: Partial<ContentGenerationRepository> = {},
): ContentGenerationRepository {
  return {
    authenticate: async () => ({
      authUserId: "8d30e582-720d-4d23-b930-6146a150729f",
      profileId: "1a6ab2fa-fd01-4790-9d8c-2d676bf2106e",
      role: "content_editor",
    }),
    getActivityContext: async () => ({
      activityId: request.activityId,
      lessonId: "36d4d1ce-5c1c-47d9-a98c-4417948d4a09",
      level: "B2",
      skillCodes: request.targetSkillIds,
    }),
    findByIdempotency: async () => undefined,
    countRecentLogicalRequests: async () => 0,
    createJob: async () => recordResult.jobId,
    recordDraft: async () => recordResult,
    markJobFailed: async () => undefined,
    recordUsage: async () => undefined,
    ...overrides,
  };
}

function createProvider(outputs: unknown[]): ContentGenerationProvider & {
  generate: jest.MockedFunction<ContentGenerationProvider["generate"]>;
} {
  let index = 0;
  const generate = jest.fn(async (): Promise<ProviderGenerationResult> => {
    if (index >= outputs.length) {
      throw new Error("Unexpected provider call");
    }
    const payload = outputs[index];
    index += 1;
    return {
      payload,
      model: "gpt-test",
      providerRequestId: `provider-${index}`,
      inputTokens: 100,
      outputTokens: 80,
      latencyMs: 20,
    };
  });
  return { model: "gpt-test", configured: true, generate };
}
