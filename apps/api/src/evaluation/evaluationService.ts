import { createHash, randomUUID } from "node:crypto";
import {
  aiEvaluationFeedbackSchema,
  aiSchemaVersions,
  createAiEvaluationFeedbackJsonSchema,
  type AiEvaluationFeedback,
} from "@deutschtrainer/ai-schemas";
import { buildEvaluateResponsePrompt, promptRegistry } from "@deutschtrainer/ai-prompts";
import type { CefrLevel } from "@deutschtrainer/shared-types";
import type { EvaluateResponseRequest, EvaluateResponseResponse } from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import { EvaluationProviderError, type ProviderErrorCode } from "./openAiEvaluationProvider";
import type {
  AuthenticatedLearner,
  EvaluationExercise,
  EvaluationProvider,
  EvaluationRepository,
  EvaluationService,
  ProviderEvaluationResult,
  UsageLogInput,
} from "./types";

export interface ResponseEvaluationServiceOptions {
  repository: EvaluationRepository;
  provider: EvaluationProvider;
  dailyLimit: number;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  now?: () => Date;
  requestId?: () => string;
}

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number;
}

interface FeedbackValidationResult {
  feedback?: AiEvaluationFeedback;
  issues: string[];
}

export class ResponseEvaluationService implements EvaluationService {
  private readonly now: () => Date;
  private readonly requestId: () => string;

  constructor(private readonly options: ResponseEvaluationServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.requestId = options.requestId ?? randomUUID;
  }

  async evaluate(
    accessToken: string,
    request: EvaluateResponseRequest,
  ): Promise<EvaluateResponseResponse> {
    const requestId = this.requestId();
    const learner = await this.options.repository.authenticate(accessToken);

    if (!learner) {
      throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    }

    const existing = await this.options.repository.findByIdempotency(
      learner.profileId,
      request.idempotencyKey,
    );
    if (existing) {
      return {
        requestId,
        status: "completed",
        attemptId: existing.attemptId,
        feedbackId: existing.feedbackId,
        feedback: existing.feedback,
        cached: existing.cached,
        model: existing.model,
        retryable: false,
        idempotentReplay: true,
        completionPercent: existing.completionPercent,
        fallbackReason: null,
        usage: emptyUsage(),
      };
    }

    const exercise = await this.options.repository.getExercise(request.exerciseId);
    if (!exercise) {
      throw new ApiError("NOT_FOUND", "找不到可批改的已發布題目。", 404, false);
    }
    validateLearnerResponse(request.responseDe, exercise);

    const since = new Date(this.now().getTime() - 24 * 60 * 60 * 1000).toISOString();
    const recentRequests = await this.options.repository.countRecentLogicalRequests(
      learner.profileId,
      since,
    );
    if (recentRequests >= this.options.dailyLimit) {
      throw new ApiError(
        "RATE_LIMITED",
        `過去 24 小時的 AI 批改額度已用完（${this.options.dailyLimit} 次）。`,
        429,
        true,
      );
    }

    const cacheKey = createEvaluationCacheKey(learner.profileId, exercise, request.responseDe);
    const cached = await this.options.repository.findCached(learner.profileId, cacheKey);
    if (cached) {
      await this.options.repository.recordUsage({
        learnerId: learner.profileId,
        requestId,
        idempotencyKey: request.idempotencyKey,
        model: cached.model,
        providerAttempt: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        latencyMs: 0,
        success: true,
        cached: true,
        logicalRequest: true,
      });
      const recorded = await this.options.repository.recordEvaluation({
        learner,
        request,
        exercise,
        feedback: cached.feedback,
        model: cached.model,
        schemaVersion: aiSchemaVersions.evaluationFeedback,
        promptId: promptRegistry.evaluateResponseV1.id,
        promptVersion: promptRegistry.evaluateResponseV1.version,
        cacheKey,
        cachedFromId: cached.feedbackId,
      });

      return {
        requestId,
        status: "completed",
        attemptId: recorded.attemptId,
        feedbackId: recorded.feedbackId,
        feedback: cached.feedback,
        cached: true,
        model: cached.model,
        retryable: false,
        idempotentReplay: recorded.idempotentReplay,
        completionPercent: recorded.completionPercent,
        fallbackReason: null,
        usage: emptyUsage(),
      };
    }

    if (!this.options.provider.configured) {
      await this.options.repository.recordUsage({
        learnerId: learner.profileId,
        requestId,
        idempotencyKey: request.idempotencyKey,
        model: this.options.provider.model,
        providerAttempt: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        latencyMs: 0,
        success: false,
        cached: false,
        logicalRequest: false,
        errorCode: "AI_NOT_CONFIGURED",
      });
      return createFallbackResponse(
        requestId,
        request,
        exercise,
        this.options.provider.model,
        "AI_NOT_CONFIGURED",
        emptyUsage(),
      );
    }

    return this.evaluateWithProvider(requestId, learner, request, exercise, cacheKey);
  }

  private async evaluateWithProvider(
    requestId: string,
    learner: AuthenticatedLearner,
    request: EvaluateResponseRequest,
    exercise: EvaluationExercise,
    cacheKey: string,
  ): Promise<EvaluateResponseResponse> {
    const totals = emptyUsage();
    let retryIssues: string[] = [];
    let fallbackReason: ProviderErrorCode = "AI_RESPONSE_INVALID";

    for (let providerAttempt = 1; providerAttempt <= 2; providerAttempt += 1) {
      const messages = buildEvaluateResponsePrompt({
        exerciseType: exercise.type,
        targetLevel: exercise.level,
        instructionZhTw: exercise.instructionZhTw,
        promptDe: exercise.promptDe,
        ...(exercise.promptZhTw ? { promptZhTw: exercise.promptZhTw } : {}),
        learnerResponseDe: request.responseDe,
        allowedSkillIds: exercise.skillIds,
        referenceAnswersDe: exercise.referenceAnswersDe,
        gradingNotesZhTw: exercise.gradingNotesZhTw,
        ...(retryIssues.length > 0 ? { retryIssues } : {}),
      });

      let providerResult: ProviderEvaluationResult;
      try {
        providerResult = await this.options.provider.evaluate({
          exercise,
          learnerResponseDe: request.responseDe,
          messages,
          jsonSchema: createAiEvaluationFeedbackJsonSchema(exercise.skillIds),
        });
      } catch (error) {
        const providerError =
          error instanceof EvaluationProviderError
            ? error
            : new EvaluationProviderError("NETWORK_ERROR", "AI 批改服務發生錯誤。", true);
        fallbackReason = providerError.code;
        retryIssues = [providerError.message];
        await this.options.repository.recordUsage({
          learnerId: learner.profileId,
          requestId,
          idempotencyKey: request.idempotencyKey,
          model: this.options.provider.model,
          providerAttempt,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCost: 0,
          latencyMs: 0,
          success: false,
          cached: false,
          logicalRequest: providerAttempt === 1,
          errorCode: providerError.code,
        });

        if (!providerError.retryable) {
          break;
        }
        continue;
      }

      addProviderUsage(totals, providerResult, this.options);
      const validation = validateFeedback(providerResult.payload, exercise);

      if (!validation.feedback) {
        fallbackReason = "AI_RESPONSE_INVALID";
        retryIssues = validation.issues;
        await this.logProviderUsage({
          learner,
          requestId,
          request,
          providerAttempt,
          providerResult,
          success: false,
          logicalRequest: providerAttempt === 1,
          errorCode: "AI_RESPONSE_INVALID",
        });
        continue;
      }

      await this.logProviderUsage({
        learner,
        requestId,
        request,
        providerAttempt,
        providerResult,
        success: true,
        logicalRequest: providerAttempt === 1,
      });
      const recorded = await this.options.repository.recordEvaluation({
        learner,
        request,
        exercise,
        feedback: validation.feedback,
        model: providerResult.model,
        schemaVersion: aiSchemaVersions.evaluationFeedback,
        promptId: promptRegistry.evaluateResponseV1.id,
        promptVersion: promptRegistry.evaluateResponseV1.version,
        cacheKey,
      });

      return {
        requestId,
        status: "completed",
        attemptId: recorded.attemptId,
        feedbackId: recorded.feedbackId,
        feedback: validation.feedback,
        cached: false,
        model: providerResult.model,
        retryable: false,
        idempotentReplay: recorded.idempotentReplay,
        completionPercent: recorded.completionPercent,
        fallbackReason: null,
        usage: totals,
      };
    }

    return createFallbackResponse(
      requestId,
      request,
      exercise,
      this.options.provider.model,
      fallbackReason,
      totals,
    );
  }

  private async logProviderUsage(input: {
    learner: AuthenticatedLearner;
    requestId: string;
    request: EvaluateResponseRequest;
    providerAttempt: number;
    providerResult: ProviderEvaluationResult;
    success: boolean;
    logicalRequest: boolean;
    errorCode?: string;
  }): Promise<void> {
    const usage: UsageLogInput = {
      learnerId: input.learner.profileId,
      requestId: input.requestId,
      idempotencyKey: input.request.idempotencyKey,
      model: input.providerResult.model,
      ...(input.providerResult.providerRequestId
        ? { providerRequestId: input.providerResult.providerRequestId }
        : {}),
      providerAttempt: input.providerAttempt,
      inputTokens: input.providerResult.inputTokens,
      outputTokens: input.providerResult.outputTokens,
      estimatedCost: estimateCost(
        input.providerResult.inputTokens,
        input.providerResult.outputTokens,
        this.options,
      ),
      latencyMs: input.providerResult.latencyMs,
      success: input.success,
      cached: false,
      logicalRequest: input.logicalRequest,
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    };
    await this.options.repository.recordUsage(usage);
  }
}

export function validateFeedback(
  payload: unknown,
  exercise: EvaluationExercise,
): FeedbackValidationResult {
  const parsed = aiEvaluationFeedbackSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const feedback = parsed.data;
  const issues: string[] = [];
  if (!feedback.isCorrect && feedback.errors.length === 0) {
    issues.push("Incorrect feedback must contain at least one classified error.");
  }
  if (feedback.isCorrect && feedback.score < 80) {
    issues.push("isCorrect cannot be true when score is below 80.");
  }
  if (!feedback.isCorrect && feedback.score >= 90) {
    issues.push("isCorrect cannot be false when score is 90 or higher.");
  }
  for (const error of feedback.errors) {
    if (!exercise.skillIds.includes(error.relatedSkillId)) {
      issues.push(`Unrelated skill: ${error.relatedSkillId}`);
    }
    if (!/[\u3400-\u9fff]/u.test(error.explanationZhTw)) {
      issues.push("Every error explanation must contain Traditional Chinese guidance.");
    }
  }
  if (
    Math.abs(cefrRank(feedback.cefrLevelEstimate) - cefrRank(exercise.level)) > 1 &&
    !feedback.requiresHumanReview
  ) {
    issues.push("A CEFR estimate far from the target level requires human review.");
  }
  if (containsUnsafeOutput(feedback)) {
    issues.push("Feedback contains blocked prompt or secret-like content.");
  }

  return issues.length > 0 ? { issues } : { feedback, issues: [] };
}

function validateLearnerResponse(response: string, exercise: EvaluationExercise): void {
  const length = Array.from(response.trim()).length;
  if (length < exercise.minimumCharacters || length > exercise.maximumCharacters) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `回答需介於 ${exercise.minimumCharacters} 至 ${exercise.maximumCharacters} 個字元。`,
      400,
      false,
    );
  }
}

function createEvaluationCacheKey(
  learnerId: string,
  exercise: EvaluationExercise,
  response: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        learnerId,
        exerciseId: exercise.id,
        exerciseVersion: exercise.version,
        response: response.trim().normalize("NFC").replace(/\s+/g, " "),
        promptVersion: promptRegistry.evaluateResponseV1.version,
        schemaVersion: aiSchemaVersions.evaluationFeedback,
      }),
    )
    .digest("hex");
}

function createFallbackResponse(
  requestId: string,
  request: EvaluateResponseRequest,
  exercise: EvaluationExercise,
  model: string,
  reason: ProviderErrorCode,
  usage: UsageTotals,
): EvaluateResponseResponse {
  const firstSkill = exercise.skillIds[0] ?? `${exercise.level}.task_completion`;
  const response = request.responseDe.trim();
  return {
    requestId,
    status: "fallback",
    attemptId: null,
    feedbackId: null,
    feedback: {
      isCorrect: false,
      score: 0,
      cefrLevelEstimate: exercise.level,
      correctedText: response,
      errors: [
        {
          type: "task_completion",
          severity: "moderate",
          original: response,
          correction: response,
          explanationZhTw: "AI 批改暫時無法完成；本次不會計入分數或技能掌握度。",
          relatedSkillId: firstSkill,
          grammarTopicId: null,
          vocabularyId: null,
        },
      ],
      strengths: ["你的原始回答已保留，可以直接重試。"],
      suggestions: ["請確認網路與伺服器設定後再次提交。"],
      naturalAlternative: response,
      requiresHumanReview: true,
    },
    cached: false,
    model,
    retryable: true,
    idempotentReplay: false,
    completionPercent: null,
    fallbackReason: reason,
    usage,
  };
}

function addProviderUsage(
  totals: UsageTotals,
  result: ProviderEvaluationResult,
  costs: Pick<ResponseEvaluationServiceOptions, "inputCostPerMillion" | "outputCostPerMillion">,
): void {
  totals.inputTokens += result.inputTokens;
  totals.outputTokens += result.outputTokens;
  totals.estimatedCost += estimateCost(result.inputTokens, result.outputTokens, costs);
  totals.latencyMs += result.latencyMs;
}

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  costs: Pick<ResponseEvaluationServiceOptions, "inputCostPerMillion" | "outputCostPerMillion">,
): number {
  return (
    (inputTokens * costs.inputCostPerMillion + outputTokens * costs.outputCostPerMillion) /
    1_000_000
  );
}

function emptyUsage(): UsageTotals {
  return { inputTokens: 0, outputTokens: 0, estimatedCost: 0, latencyMs: 0 };
}

function cefrRank(level: CefrLevel): number {
  return { B1: 1, B2: 2, C1: 3, C2: 4 }[level];
}

function containsUnsafeOutput(feedback: AiEvaluationFeedback): boolean {
  const serialized = JSON.stringify(feedback);
  return /<script|sk-[a-z0-9_-]{16,}|system prompt|developer message/i.test(serialized);
}
