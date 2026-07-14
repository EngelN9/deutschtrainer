import { randomUUID } from "node:crypto";
import {
  generatedExerciseDraftJsonSchema,
  generatedExerciseDraftSchema,
  type GeneratedExerciseDraft,
} from "@deutschtrainer/ai-schemas";
import { buildGenerateExerciseDraftPrompt } from "@deutschtrainer/ai-prompts";
import type {
  GenerateExerciseDraftRequest,
  GenerateExerciseDraftResponse,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import {
  ContentGenerationProviderError,
  type ContentGenerationProviderErrorCode,
} from "./openAiContentGenerationProvider";
import type {
  AuthenticatedContentUser,
  ContentGenerationProvider,
  ContentGenerationRepository,
  ContentGenerationServiceContract,
  GenerationUsageInput,
  PersistedGeneratedExerciseDraft,
  ProviderGenerationResult,
} from "./types";

export interface ContentGenerationServiceOptions {
  repository: ContentGenerationRepository;
  provider: ContentGenerationProvider;
  dailyLimit: number;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  now?: () => Date;
  requestId?: () => string;
  uuid?: () => string;
}

export class ContentGenerationService implements ContentGenerationServiceContract {
  private readonly now: () => Date;
  private readonly createRequestId: () => string;
  private readonly createUuid: () => string;

  constructor(private readonly options: ContentGenerationServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.createRequestId = options.requestId ?? randomUUID;
    this.createUuid = options.uuid ?? randomUUID;
  }

  async generateExerciseDraft(
    accessToken: string,
    request: GenerateExerciseDraftRequest,
  ): Promise<GenerateExerciseDraftResponse> {
    const requestId = this.createRequestId();
    const user = await this.options.repository.authenticate(accessToken);
    if (!user) {
      throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    }
    if (user.role === "reviewer") {
      throw new ApiError("FORBIDDEN", "審核者不可建立 AI 題目草稿。", 403, false);
    }

    const existing = await this.options.repository.findByIdempotency(
      user.profileId,
      request.idempotencyKey,
    );
    if (existing) {
      return {
        jobId: existing.jobId,
        exerciseId: existing.exerciseId,
        contentVersionId: existing.contentVersionId,
        status: "draft",
        reviewStatus: "draft",
        sourceType: "ai_generated",
        draft: existing.draft,
        idempotentReplay: true,
      };
    }

    const context = await this.options.repository.getActivityContext(
      request.activityId,
      request.targetSkillIds,
    );
    if (!context) {
      throw new ApiError("NOT_FOUND", "找不到可使用的活動或技能。", 404, false);
    }
    if (context.level !== request.level) {
      throw new ApiError("VALIDATION_ERROR", "題目程度必須與所屬課堂一致。", 400, false);
    }
    if (request.targetSkillIds.some((skillId) => !context.skillCodes.includes(skillId))) {
      throw new ApiError("VALIDATION_ERROR", "指定技能不屬於目前內容資料庫。", 400, false);
    }

    const since = new Date(this.now().getTime() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await this.options.repository.countRecentLogicalRequests(user.profileId, since);
    if (recent >= this.options.dailyLimit) {
      throw new ApiError(
        "RATE_LIMITED",
        `過去 24 小時的 AI 草稿額度已用完（${this.options.dailyLimit} 次）。`,
        429,
        true,
      );
    }

    const jobId = await this.options.repository.createJob(user, request);
    if (!this.options.provider.configured) {
      await this.options.repository.markJobFailed(jobId, "AI_NOT_CONFIGURED", [
        "OpenAI API key is not configured.",
      ]);
      throw new ApiError("AI_NOT_CONFIGURED", "伺服器尚未設定 AI 題目生成服務。", 503, true);
    }

    return this.generateWithProvider(requestId, jobId, user, request);
  }

  private async generateWithProvider(
    requestId: string,
    jobId: string,
    user: AuthenticatedContentUser,
    request: GenerateExerciseDraftRequest,
  ): Promise<GenerateExerciseDraftResponse> {
    let retryIssues: string[] = [];
    let finalError: ContentGenerationProviderErrorCode = "AI_RESPONSE_INVALID";

    for (let providerAttempt = 1; providerAttempt <= 2; providerAttempt += 1) {
      let providerResult: ProviderGenerationResult;
      try {
        providerResult = await this.options.provider.generate({
          request,
          messages: buildGenerateExerciseDraftPrompt({
            level: request.level,
            type: request.type,
            topicZhTw: request.topicZhTw,
            targetSkillIds: request.targetSkillIds,
            instructionsZhTw: request.instructionsZhTw,
            ...(retryIssues.length > 0 ? { retryIssues } : {}),
          }),
          jsonSchema: generatedExerciseDraftJsonSchema as unknown as Record<string, unknown>,
        });
      } catch (error) {
        const providerError =
          error instanceof ContentGenerationProviderError
            ? error
            : new ContentGenerationProviderError(
                "NETWORK_ERROR",
                "AI 題目生成服務發生錯誤。",
                true,
              );
        finalError = providerError.code;
        retryIssues = [providerError.message];
        await this.options.repository.recordUsage(
          createUsage({
            user,
            request,
            requestId,
            providerAttempt,
            model: this.options.provider.model,
            success: false,
            logicalRequest: providerAttempt === 1,
            errorCode: providerError.code,
            options: this.options,
          }),
        );
        if (!providerError.retryable) {
          break;
        }
        continue;
      }

      const validation = validateGeneratedDraft(providerResult.payload, request);
      await this.options.repository.recordUsage(
        createUsage({
          user,
          request,
          requestId,
          providerAttempt,
          model: providerResult.model,
          providerResult,
          success: Boolean(validation.draft),
          logicalRequest: providerAttempt === 1,
          ...(validation.draft ? {} : { errorCode: "AI_RESPONSE_INVALID" }),
          options: this.options,
        }),
      );
      if (!validation.draft) {
        finalError = "AI_RESPONSE_INVALID";
        retryIssues = validation.issues;
        continue;
      }

      const storedDraft = createPersistedDraft(validation.draft, this.createUuid);
      const recorded = await this.options.repository.recordDraft(
        jobId,
        storedDraft,
        providerResult.model,
        providerResult.providerRequestId,
      );
      return {
        ...recorded,
        draft: validation.draft,
        idempotentReplay: false,
      };
    }

    await this.options.repository.markJobFailed(jobId, finalError, retryIssues);
    throw new ApiError(
      finalError,
      finalError === "AI_RESPONSE_INVALID"
        ? "AI 草稿未通過內容驗證，已保留失敗紀錄但不建立題目。"
        : "AI 題目生成暫時失敗，請稍後重試。",
      finalError === "RATE_LIMITED" ? 429 : 502,
      true,
    );
  }
}

export function validateGeneratedDraft(
  payload: unknown,
  request: GenerateExerciseDraftRequest,
): { draft?: GeneratedExerciseDraft; issues: string[] } {
  const parsed = generatedExerciseDraftSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const issues: string[] = [];
  if (parsed.data.type !== request.type) {
    issues.push("Generated exercise type does not match the request.");
  }
  if (!/[A-Za-zÄÖÜäöüß]/u.test(parsed.data.promptDe)) {
    issues.push("German prompt does not contain German-language text.");
  }
  for (const value of [
    parsed.data.titleZhTw,
    parsed.data.instructionZhTw,
    parsed.data.explanationZhTw ?? "",
  ]) {
    if (value && !/[\u3400-\u9fff]/u.test(value)) {
      issues.push("Traditional Chinese editorial text is required.");
      break;
    }
  }
  if (containsBlockedOutput(parsed.data)) {
    issues.push("Generated draft contains blocked prompt or secret-like content.");
  }

  return issues.length === 0 ? { draft: parsed.data, issues: [] } : { issues };
}

function createPersistedDraft(
  draft: GeneratedExerciseDraft,
  createUuid: () => string,
): PersistedGeneratedExerciseDraft {
  const options = draft.options.map((option, index) => ({
    ...option,
    id: createUuid(),
    orderIndex: index,
  }));
  const correctOption = options.find((option) => option.isCorrect);
  const answerJson =
    draft.type === "multiple_choice"
      ? { optionId: correctOption?.id ?? "" }
      : { acceptedAnswers: draft.acceptedAnswers };

  return {
    ...draft,
    payloadJson: {},
    grammarTopicIds: [],
    vocabularyIds: [],
    options,
    answerJson,
    gradingPolicyJson: {
      caseSensitive: false,
      ignorePunctuation: true,
      normalizeGermanCharacters: true,
      allowPartialCredit: false,
      acceptedAlternatives: draft.acceptedAnswers,
    },
  };
}

function createUsage(input: {
  user: AuthenticatedContentUser;
  request: GenerateExerciseDraftRequest;
  requestId: string;
  providerAttempt: number;
  model: string;
  providerResult?: ProviderGenerationResult;
  success: boolean;
  logicalRequest: boolean;
  errorCode?: string;
  options: ContentGenerationServiceOptions;
}): GenerationUsageInput {
  const inputTokens = input.providerResult?.inputTokens ?? 0;
  const outputTokens = input.providerResult?.outputTokens ?? 0;
  return {
    userId: input.user.profileId,
    requestId: input.requestId,
    idempotencyKey: input.request.idempotencyKey,
    model: input.model,
    ...(input.providerResult?.providerRequestId
      ? { providerRequestId: input.providerResult.providerRequestId }
      : {}),
    providerAttempt: input.providerAttempt,
    inputTokens,
    outputTokens,
    estimatedCost:
      (inputTokens * input.options.inputCostPerMillion +
        outputTokens * input.options.outputCostPerMillion) /
      1_000_000,
    latencyMs: input.providerResult?.latencyMs ?? 0,
    success: input.success,
    logicalRequest: input.logicalRequest,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  };
}

function containsBlockedOutput(draft: GeneratedExerciseDraft): boolean {
  const serialized = JSON.stringify(draft).toLowerCase();
  return [
    "system prompt",
    "developer message",
    "api key",
    "service_role",
    "sk-",
    "ignore previous",
  ].some((token) => serialized.includes(token));
}
