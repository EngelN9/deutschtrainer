import { describe, expect, it, jest } from "@jest/globals";
import type { WritingFeedback } from "@deutschtrainer/ai-schemas";
import type { EvaluateWritingRequest } from "@deutschtrainer/validation";
import { UnavailableWritingProvider } from "./openAiWritingProvider";
import { WritingEvaluationService, countGermanWords, createWritingDiff } from "./writingService";
import type {
  ProtectedWritingPrompt,
  ProviderWritingResult,
  WritingProvider,
  WritingRepository,
  WritingUsageLogInput,
} from "./types";

const prompt: ProtectedWritingPrompt = {
  id: "45bf7059-9e5d-4303-88a8-48303079ac44",
  lessonId: "a58a6706-56e1-475e-a959-4f3aff3f78d4",
  level: "B1",
  writingType: "formal_email",
  titleZhTw: "更改德語課程日期",
  promptDe: "Schreiben Sie an die Sprachschule und bitten Sie um eine Lösung.",
  promptZhTw: "寫信給語言學校並提出解決方式。",
  requirementsZhTw: ["說明原因", "提出替代方案"],
  minimumWords: 20,
  maximumWords: 140,
  estimatedMinutes: 20,
  skillIds: ["B1.writing.formal_email", "B1.register.formal"],
  version: 1,
  gradingNotesZhTw: "檢查正式信件格式與從句語序。",
  referenceOutlineZhTw: ["稱謂", "原因", "解決方案", "結尾"],
  referenceVersionDe:
    "Sehr geehrte Frau Berger, leider kann ich nächste Woche nicht teilnehmen. Könnten Sie mir bitte die Unterlagen schicken? Mit freundlichen Grüßen, Lin Chen",
};

const request: EvaluateWritingRequest = {
  promptId: prompt.id,
  textDe:
    "Sehr geehrte Frau Berger, leider kann ich nächste Woche nicht am Unterricht teilnehmen, weil ich arbeiten muss. Ich muss beruflich nach Berlin fahren. Könnten Sie mir bitte die Arbeitsblätter schicken? Außerdem möchte ich fragen, ob ich die Stunde am Freitag nachholen kann. Vielen Dank für Ihre Hilfe. Mit freundlichen Grüßen Lin Chen",
  durationMs: 120_000,
  idempotencyKey: "phase6-writing-test-v1",
};

const feedback: WritingFeedback = {
  score: 86,
  cefrLevelEstimate: "B1",
  rubricScores: {
    taskCompletion: 90,
    grammar: 84,
    vocabulary: 82,
    coherence: 88,
    cohesion: 84,
    register: 90,
    argumentation: 80,
    style: 84,
    accuracy: 86,
    idiomaticity: 82,
  },
  inlineErrors: [],
  strengths: ["任務回應完整，正式語氣清楚。"],
  revisionTasks: ["再檢查段落銜接與標點。"],
  referenceVersion: null,
  repeatedErrorTypes: [],
  requiresHumanReview: false,
};

describe("WritingEvaluationService", () => {
  it("saves version one before recording schema-validated feedback", async () => {
    const events: string[] = [];
    const usage: WritingUsageLogInput[] = [];
    const repository = createRepository({
      prepareVersion: async () => {
        events.push("version");
        return preparedVersion(1);
      },
      recordFeedback: async () => {
        events.push("feedback");
        return {
          feedbackId: "12578dad-2288-4c55-8230-5bc3d7bc0934",
          idempotentReplay: false,
        };
      },
      recordUsage: async (entry) => {
        usage.push(entry);
      },
    });
    const service = createService(repository, createProvider([{ payload: feedback }]));

    const result = await service.evaluate("valid-token", request);

    expect(result.status).toBe("completed");
    expect(result.feedback?.referenceVersion).toBeNull();
    expect(events).toEqual(["version", "feedback"]);
    expect(usage).toHaveLength(1);
    expect(usage[0]?.logicalRequest).toBe(true);
  });

  it("retries once when inline offsets do not match the learner text", async () => {
    const invalidFeedback: WritingFeedback = {
      ...feedback,
      score: 72,
      inlineErrors: [
        {
          type: "word_order",
          severity: "major",
          original: "nicht im Text",
          correction: "weil ich arbeiten muss",
          explanationZhTw: "從句動詞應放在句尾。",
          relatedSkillId: prompt.skillIds[0] ?? "B1.writing.formal_email",
          grammarTopicId: null,
          vocabularyId: null,
          startOffset: 0,
          endOffset: 13,
        },
      ],
    };
    const provider = createProvider([{ payload: invalidFeedback }, { payload: feedback }]);
    const service = createService(createRepository(), provider);

    const result = await service.evaluate("valid-token", request);

    expect(result.status).toBe("completed");
    expect(provider.evaluate).toHaveBeenCalledTimes(2);
  });

  it("keeps the saved version and marks it failed when AI is unavailable", async () => {
    const markEvaluationFailed = jest.fn(async () => undefined);
    const prepareVersion = jest.fn(async () => preparedVersion(1));
    const service = createService(
      createRepository({ prepareVersion, markEvaluationFailed }),
      new UnavailableWritingProvider("gpt-test"),
    );

    const result = await service.evaluate("valid-token", request);

    expect(result.status).toBe("fallback");
    expect(result.submissionId).toBe(preparedVersion(1).submissionId);
    expect(result.fallbackReason).toBe("AI_NOT_CONFIGURED");
    expect(prepareVersion).toHaveBeenCalledTimes(1);
    expect(markEvaluationFailed).toHaveBeenCalledWith(
      "6ff91bf7-37d7-4f24-8682-8ee5d3020a5f",
      preparedVersion(1).versionId,
    );
  });

  it("requires the trusted full reference version on the second pass", async () => {
    const rewrittenRequest: EvaluateWritingRequest = {
      ...request,
      submissionId: preparedVersion(1).submissionId,
      textDe: request.textDe.replace("weil ich arbeiten muss", "da ich arbeiten muss"),
      idempotencyKey: "phase6-writing-test-v2",
    };
    const secondFeedback: WritingFeedback = {
      ...feedback,
      score: 90,
      referenceVersion: prompt.referenceVersionDe,
    };
    const repository = createRepository({
      getSubmissionContext: async () => ({
        submissionId: preparedVersion(1).submissionId,
        promptId: prompt.id,
        currentVersionId: preparedVersion(1).versionId,
        currentVersionNumber: 1,
        currentTextDe: request.textDe,
        currentFeedback: feedback,
      }),
      prepareVersion: async () => preparedVersion(2),
    });
    const service = createService(repository, createProvider([{ payload: secondFeedback }]));

    const result = await service.evaluate("valid-token", rewrittenRequest);

    expect(result.status).toBe("completed");
    expect(result.versionNumber).toBe(2);
    expect(result.feedback?.referenceVersion).toBe(prompt.referenceVersionDe);
  });

  it("returns an existing completed version without calling the provider", async () => {
    const provider = createProvider([]);
    const repository = createRepository({
      findByIdempotency: async () => ({
        promptId: prompt.id,
        submissionId: preparedVersion(1).submissionId,
        versionId: preparedVersion(1).versionId,
        versionNumber: 1,
        textDe: request.textDe,
        wordCount: countGermanWords(request.textDe),
        diff: [],
        feedbackId: "12578dad-2288-4c55-8230-5bc3d7bc0934",
        feedback,
        model: "gpt-test",
      }),
    });
    const service = createService(repository, provider);

    const result = await service.evaluate("valid-token", request);

    expect(result.idempotentReplay).toBe(true);
    expect(provider.evaluate).not.toHaveBeenCalled();
  });
});

describe("writing helpers", () => {
  it("counts whitespace-separated German words like the database RPC", () => {
    expect(countGermanWords(" Eins\n zwei\t drei ")).toBe(3);
  });

  it("creates a stable word diff for version comparison", () => {
    const diff = createWritingDiff("Ich muss arbeiten.", "Ich kann heute arbeiten.");

    expect(
      diff
        .filter((change) => change.kind !== "added")
        .map((change) => change.value)
        .join(""),
    ).toBe("Ich muss arbeiten.");
    expect(
      diff
        .filter((change) => change.kind !== "removed")
        .map((change) => change.value)
        .join(""),
    ).toBe("Ich kann heute arbeiten.");
    expect(diff.map((change) => change.kind)).toContain("added");
    expect(diff.map((change) => change.kind)).toContain("removed");
  });
});

function createService(repository: WritingRepository, provider: WritingProvider) {
  return new WritingEvaluationService({
    repository,
    provider,
    dailyLimit: 10,
    inputCostPerMillion: 1,
    outputCostPerMillion: 6,
    now: () => new Date("2026-07-13T05:00:00.000Z"),
    requestId: () => "writing-request-test",
  });
}

function createRepository(overrides: Partial<WritingRepository> = {}): WritingRepository {
  return {
    authenticate: async () => ({
      authUserId: "a2a0a460-f0a8-49d3-b046-4748eb241ce8",
      profileId: "6ff91bf7-37d7-4f24-8682-8ee5d3020a5f",
      timezone: "Asia/Taipei",
    }),
    findByIdempotency: async () => undefined,
    getPrompt: async () => prompt,
    getSubmissionContext: async () => undefined,
    countRecentLogicalRequests: async () => 0,
    prepareVersion: async () => preparedVersion(1),
    recordFeedback: async () => ({
      feedbackId: "12578dad-2288-4c55-8230-5bc3d7bc0934",
      idempotentReplay: false,
    }),
    markEvaluationFailed: async () => undefined,
    recordUsage: async () => undefined,
    ...overrides,
  };
}

function preparedVersion(versionNumber: number) {
  return {
    submissionId: "2980a456-9b89-4841-a3ba-47e307e7bf9c",
    versionId:
      versionNumber === 1
        ? "db6e0ab7-61a9-43ac-9e25-65b190b877a1"
        : "18de91cc-58d4-46e8-b40e-97d11aa503b8",
    versionNumber,
    ...(versionNumber > 1 ? { previousVersionId: "db6e0ab7-61a9-43ac-9e25-65b190b877a1" } : {}),
    created: true,
  };
}

function createProvider(
  outcomes: Array<{ payload?: unknown }>,
): WritingProvider & { evaluate: jest.MockedFunction<WritingProvider["evaluate"]> } {
  let index = 0;
  const evaluate = jest.fn(async (): Promise<ProviderWritingResult> => {
    const outcome = outcomes[index];
    index += 1;
    if (!outcome) {
      throw new Error("Unexpected provider call");
    }
    return {
      payload: outcome.payload,
      model: "gpt-test",
      providerRequestId: `writing-provider-${index}`,
      inputTokens: 200,
      outputTokens: 100,
      latencyMs: 30,
    };
  });
  return { model: "gpt-test", configured: true, evaluate };
}
