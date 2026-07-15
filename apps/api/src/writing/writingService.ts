import { randomUUID } from "node:crypto";
import { diffWordsWithSpace } from "diff";
import {
  aiSchemaVersions,
  createWritingFeedbackJsonSchema,
  writingFeedbackSchema,
  type WritingFeedback,
} from "@deutschtrainer/ai-schemas";
import { buildEvaluateWritingPrompt, promptRegistry } from "@deutschtrainer/ai-prompts";
import {
  WRITING_RUBRIC_DIMENSIONS,
  type CefrLevel,
  type ErrorType,
  type WritingDiffChange,
} from "@deutschtrainer/shared-types";
import type {
  DeleteWritingSubmissionResponse,
  EvaluateWritingRequest,
  EvaluateWritingResponse,
  WritingWorkspaceResponse,
} from "@deutschtrainer/validation";
import type { AuthenticatedLearner } from "../evaluation/types";
import { ApiError } from "../errors";
import { PrivateRequestRateLimiter } from "../privateRequestRateLimiter";
import { WritingProviderError, type WritingProviderErrorCode } from "./openAiWritingProvider";
import type {
  PreparedWritingVersion,
  ProtectedWritingPrompt,
  ProviderWritingResult,
  StoredWritingVersion,
  WritingProvider,
  WritingRepository,
  WritingService,
  WritingUsageLogInput,
} from "./types";

export interface WritingEvaluationServiceOptions {
  repository: WritingRepository;
  provider: WritingProvider;
  dailyLimit: number;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  privateRequestsPerMinute?: number;
  rateLimiter?: PrivateRequestRateLimiter;
  now?: () => Date;
  requestId?: () => string;
}

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number;
}

export interface WritingFeedbackValidationResult {
  feedback?: WritingFeedback;
  issues: string[];
}

export class WritingEvaluationService implements WritingService {
  private readonly now: () => Date;
  private readonly requestId: () => string;
  private readonly rateLimiter: PrivateRequestRateLimiter;

  constructor(private readonly options: WritingEvaluationServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.requestId = options.requestId ?? randomUUID;
    this.rateLimiter =
      options.rateLimiter ??
      new PrivateRequestRateLimiter(options.privateRequestsPerMinute ?? 60, this.now);
  }

  async getWorkspace(accessToken: string): Promise<WritingWorkspaceResponse> {
    const learner = await this.requireLearner(accessToken);
    return this.options.repository.getWorkspace(learner.profileId);
  }

  async evaluate(
    accessToken: string,
    request: EvaluateWritingRequest,
  ): Promise<EvaluateWritingResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);

    const existing = await this.options.repository.findByIdempotency(
      learner.profileId,
      request.idempotencyKey,
    );
    validateIdempotentRequest(existing, request);

    if (existing?.feedback && existing.feedbackId && existing.model) {
      return {
        requestId,
        status: "completed",
        submissionId: existing.submissionId,
        versionId: existing.versionId,
        feedbackId: existing.feedbackId,
        versionNumber: existing.versionNumber,
        feedback: existing.feedback,
        model: existing.model,
        retryable: false,
        idempotentReplay: true,
        fallbackReason: null,
        usage: emptyUsage(),
      };
    }

    const prompt = await this.options.repository.getPrompt(request.promptId);
    if (!prompt) {
      throw new ApiError("NOT_FOUND", "找不到可使用的已發布作文題目。", 404, false);
    }
    const wordCount = countGermanWords(request.textDe);
    validateWordCount(wordCount, prompt);

    let prepared: PreparedWritingVersion;
    let previousErrorTypes: ErrorType[];

    if (existing) {
      prepared = {
        submissionId: existing.submissionId,
        versionId: existing.versionId,
        versionNumber: existing.versionNumber,
        ...(existing.previousVersionId ? { previousVersionId: existing.previousVersionId } : {}),
        created: false,
      };
      previousErrorTypes = collectErrorTypes(existing.previousFeedback);
    } else {
      const context = request.submissionId
        ? await this.options.repository.getSubmissionContext(
            learner.profileId,
            request.submissionId,
          )
        : undefined;
      if (request.submissionId && !context) {
        throw new ApiError("NOT_FOUND", "找不到可修改的作文提交紀錄。", 404, false);
      }
      if (context?.promptId !== undefined && context.promptId !== prompt.id) {
        throw new ApiError("VALIDATION_ERROR", "重寫版本必須使用原本的作文題目。", 400, false);
      }

      previousErrorTypes = collectErrorTypes(context?.currentFeedback);
      prepared = await this.options.repository.prepareVersion({
        learner,
        prompt,
        ...(context ? { submissionId: context.submissionId } : {}),
        ...(context ? { expectedCurrentVersionId: context.currentVersionId } : {}),
        textDe: request.textDe,
        wordCount,
        diff: context ? createWritingDiff(context.currentTextDe, request.textDe) : [],
        idempotencyKey: request.idempotencyKey,
      });
    }

    if (prepared.created) {
      const since = new Date(this.now().getTime() - 24 * 60 * 60 * 1000).toISOString();
      const recentRequests = await this.options.repository.countRecentLogicalRequests(
        learner.profileId,
        since,
      );
      if (recentRequests >= this.options.dailyLimit) {
        await this.failPreparedVersion(learner.profileId, prepared.versionId, {
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
          logicalRequest: true,
          errorCode: "RATE_LIMITED",
        });
        return createFallbackResponse(
          requestId,
          prepared,
          this.options.provider.model,
          "RATE_LIMITED",
          emptyUsage(),
        );
      }
    }

    if (!this.options.provider.configured) {
      await this.failPreparedVersion(learner.profileId, prepared.versionId, {
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
        logicalRequest: prepared.created,
        errorCode: "AI_NOT_CONFIGURED",
      });
      return createFallbackResponse(
        requestId,
        prepared,
        this.options.provider.model,
        "AI_NOT_CONFIGURED",
        emptyUsage(),
      );
    }

    return this.evaluateWithProvider(
      requestId,
      learner.profileId,
      request,
      prompt,
      prepared,
      previousErrorTypes,
    );
  }

  async deleteSubmission(
    accessToken: string,
    submissionId: string,
  ): Promise<DeleteWritingSubmissionResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);
    await this.options.repository.deleteSubmission(learner.profileId, submissionId);
    return { requestId, deleted: true };
  }

  private async evaluateWithProvider(
    requestId: string,
    learnerId: string,
    request: EvaluateWritingRequest,
    prompt: ProtectedWritingPrompt,
    prepared: PreparedWritingVersion,
    previousErrorTypes: ErrorType[],
  ): Promise<EvaluateWritingResponse> {
    const totals = emptyUsage();
    let retryIssues: string[] = [];
    let fallbackReason: WritingProviderErrorCode = "AI_RESPONSE_INVALID";

    for (let providerAttempt = 1; providerAttempt <= 2; providerAttempt += 1) {
      const messages = buildEvaluateWritingPrompt({
        targetLevel: prompt.level,
        writingType: prompt.writingType,
        titleZhTw: prompt.titleZhTw,
        promptDe: prompt.promptDe,
        promptZhTw: prompt.promptZhTw,
        requirementsZhTw: prompt.requirementsZhTw,
        learnerTextDe: request.textDe,
        versionNumber: prepared.versionNumber,
        allowedSkillIds: prompt.skillIds,
        gradingNotesZhTw: prompt.gradingNotesZhTw,
        referenceOutlineZhTw: prompt.referenceOutlineZhTw,
        referenceVersionDe: prompt.referenceVersionDe,
        previousErrorTypes,
        ...(retryIssues.length > 0 ? { retryIssues } : {}),
      });

      let providerResult: ProviderWritingResult;
      try {
        providerResult = await this.options.provider.evaluate({
          prompt,
          learnerTextDe: request.textDe,
          versionNumber: prepared.versionNumber,
          previousErrorTypes,
          messages,
          jsonSchema: createWritingFeedbackJsonSchema(prompt.skillIds),
        });
      } catch (error) {
        const providerError =
          error instanceof WritingProviderError
            ? error
            : new WritingProviderError("NETWORK_ERROR", "AI 作文批改發生錯誤。", true);
        fallbackReason = providerError.code;
        retryIssues = [providerError.message];
        await this.options.repository.recordUsage({
          learnerId,
          requestId,
          idempotencyKey: request.idempotencyKey,
          model: this.options.provider.model,
          providerAttempt,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCost: 0,
          latencyMs: 0,
          success: false,
          logicalRequest: prepared.created && providerAttempt === 1,
          errorCode: providerError.code,
        });
        if (!providerError.retryable) {
          break;
        }
        continue;
      }

      addProviderUsage(totals, providerResult, this.options);
      const validation = validateWritingFeedback(
        providerResult.payload,
        prompt,
        request.textDe,
        prepared.versionNumber,
        previousErrorTypes,
      );
      if (!validation.feedback) {
        fallbackReason = "AI_RESPONSE_INVALID";
        retryIssues = validation.issues;
        await this.logProviderUsage({
          learnerId,
          requestId,
          request,
          prepared,
          providerAttempt,
          providerResult,
          success: false,
          errorCode: "AI_RESPONSE_INVALID",
        });
        continue;
      }

      await this.logProviderUsage({
        learnerId,
        requestId,
        request,
        prepared,
        providerAttempt,
        providerResult,
        success: true,
      });

      try {
        const recorded = await this.options.repository.recordFeedback({
          learnerId,
          versionId: prepared.versionId,
          feedback: validation.feedback,
          model: providerResult.model,
          schemaVersion: aiSchemaVersions.writingFeedback,
          promptId: promptRegistry.evaluateWritingV1.id,
          promptVersion: promptRegistry.evaluateWritingV1.version,
        });
        return {
          requestId,
          status: "completed",
          submissionId: prepared.submissionId,
          versionId: prepared.versionId,
          feedbackId: recorded.feedbackId,
          versionNumber: prepared.versionNumber,
          feedback: validation.feedback,
          model: providerResult.model,
          retryable: false,
          idempotentReplay: !prepared.created || recorded.idempotentReplay,
          fallbackReason: null,
          usage: totals,
        };
      } catch (error) {
        await this.options.repository.markEvaluationFailed(learnerId, prepared.versionId);
        throw error;
      }
    }

    await this.options.repository.markEvaluationFailed(learnerId, prepared.versionId);
    return createFallbackResponse(
      requestId,
      prepared,
      this.options.provider.model,
      fallbackReason,
      totals,
    );
  }

  private async logProviderUsage(input: {
    learnerId: string;
    requestId: string;
    request: EvaluateWritingRequest;
    prepared: PreparedWritingVersion;
    providerAttempt: number;
    providerResult: ProviderWritingResult;
    success: boolean;
    errorCode?: string;
  }): Promise<void> {
    await this.options.repository.recordUsage({
      learnerId: input.learnerId,
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
      logicalRequest: input.prepared.created && input.providerAttempt === 1,
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    });
  }

  private async failPreparedVersion(
    learnerId: string,
    versionId: string,
    usage: WritingUsageLogInput,
  ): Promise<void> {
    await this.options.repository.markEvaluationFailed(learnerId, versionId);
    await this.options.repository.recordUsage(usage);
  }

  private async requireLearner(accessToken: string): Promise<AuthenticatedLearner> {
    const learner = await this.options.repository.authenticate(accessToken);
    if (!learner) {
      throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    }
    this.rateLimiter.assertAllowed(learner.profileId);
    return learner;
  }
}

export function validateWritingFeedback(
  payload: unknown,
  prompt: ProtectedWritingPrompt,
  textDe: string,
  versionNumber: number,
  previousErrorTypes: readonly ErrorType[],
): WritingFeedbackValidationResult {
  const parsed = writingFeedbackSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const feedback = parsed.data;
  const issues: string[] = [];
  let previousEndOffset = -1;
  for (const error of feedback.inlineErrors) {
    if (error.startOffset >= error.endOffset || error.endOffset > textDe.length) {
      issues.push("Inline error offsets are outside the learner text.");
      continue;
    }
    if (error.startOffset < previousEndOffset) {
      issues.push("Inline error offsets must be ordered and non-overlapping.");
    }
    if (textDe.slice(error.startOffset, error.endOffset) !== error.original) {
      issues.push("Inline error original text does not match its UTF-16 offsets.");
    }
    if (!prompt.skillIds.includes(error.relatedSkillId)) {
      issues.push(`Unrelated skill: ${error.relatedSkillId}`);
    }
    if (!containsChineseGuidance(error.explanationZhTw)) {
      issues.push("Every inline explanation must contain Traditional Chinese guidance.");
    }
    previousEndOffset = Math.max(previousEndOffset, error.endOffset);
  }

  for (const message of [...feedback.strengths, ...feedback.revisionTasks]) {
    if (!containsChineseGuidance(message)) {
      issues.push("Strengths and revision tasks must contain Traditional Chinese guidance.");
    }
  }

  const rubricAverage =
    WRITING_RUBRIC_DIMENSIONS.reduce(
      (total, dimension) => total + feedback.rubricScores[dimension],
      0,
    ) / WRITING_RUBRIC_DIMENSIONS.length;
  if (Math.abs(feedback.score - rubricAverage) > 20) {
    issues.push("Overall score is inconsistent with the rubric scores.");
  }

  if (versionNumber === 1 && feedback.referenceVersion !== null) {
    issues.push("The first writing pass cannot reveal a complete reference version.");
  }
  if (versionNumber >= 2 && feedback.referenceVersion !== prompt.referenceVersionDe) {
    issues.push("A rewritten submission must return the trusted reference version exactly.");
  }

  const currentErrorTypes = new Set(feedback.inlineErrors.map((error) => error.type));
  const expectedRepeated = new Set(
    previousErrorTypes.filter((type) => currentErrorTypes.has(type)),
  );
  const actualRepeated = new Set(feedback.repeatedErrorTypes);
  if (
    actualRepeated.size !== feedback.repeatedErrorTypes.length ||
    actualRepeated.size !== expectedRepeated.size ||
    [...expectedRepeated].some((type) => !actualRepeated.has(type))
  ) {
    issues.push(
      "Repeated error types must exactly match errors repeated from the previous version.",
    );
  }

  if (
    Math.abs(cefrRank(feedback.cefrLevelEstimate) - cefrRank(prompt.level)) > 1 &&
    !feedback.requiresHumanReview
  ) {
    issues.push("A CEFR estimate far from the target level requires human review.");
  }
  if (containsUnsafeOutput(feedback)) {
    issues.push("Writing feedback contains blocked prompt or secret-like content.");
  }

  return issues.length > 0 ? { issues } : { feedback, issues: [] };
}

export function createWritingDiff(previousText: string, nextText: string): WritingDiffChange[] {
  return diffWordsWithSpace(previousText, nextText)
    .filter((change) => change.value.length > 0)
    .map((change) => ({
      kind: change.added ? "added" : change.removed ? "removed" : "unchanged",
      value: change.value,
    }));
}

export function countGermanWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}

function validateIdempotentRequest(
  existing: StoredWritingVersion | undefined,
  request: EvaluateWritingRequest,
): void {
  if (!existing) {
    return;
  }
  const submissionMismatch =
    request.submissionId !== undefined && request.submissionId !== existing.submissionId;
  const missingRewriteSubmission =
    existing.versionNumber >= 2 && request.submissionId !== existing.submissionId;
  if (
    existing.promptId !== request.promptId ||
    existing.textDe.trim() !== request.textDe.trim() ||
    submissionMismatch ||
    missingRewriteSubmission
  ) {
    throw new ApiError("VALIDATION_ERROR", "此重試識別碼已用於不同的作文內容。", 409, false);
  }
}

function validateWordCount(wordCount: number, prompt: ProtectedWritingPrompt): void {
  if (wordCount < prompt.minimumWords || wordCount > prompt.maximumWords) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `作文需介於 ${prompt.minimumWords} 至 ${prompt.maximumWords} 字，目前為 ${wordCount} 字。`,
      400,
      false,
    );
  }
}

function collectErrorTypes(feedback: WritingFeedback | undefined): ErrorType[] {
  return [...new Set(feedback?.inlineErrors.map((error) => error.type) ?? [])];
}

function createFallbackResponse(
  requestId: string,
  prepared: PreparedWritingVersion,
  model: string,
  reason: WritingProviderErrorCode,
  usage: UsageTotals,
): EvaluateWritingResponse {
  return {
    requestId,
    status: "fallback",
    submissionId: prepared.submissionId,
    versionId: prepared.versionId,
    feedbackId: null,
    versionNumber: prepared.versionNumber,
    feedback: null,
    model,
    retryable: true,
    idempotentReplay: !prepared.created,
    fallbackReason: reason,
    usage,
  };
}

function addProviderUsage(
  totals: UsageTotals,
  result: ProviderWritingResult,
  costs: Pick<WritingEvaluationServiceOptions, "inputCostPerMillion" | "outputCostPerMillion">,
): void {
  totals.inputTokens += result.inputTokens;
  totals.outputTokens += result.outputTokens;
  totals.estimatedCost += estimateCost(result.inputTokens, result.outputTokens, costs);
  totals.latencyMs += result.latencyMs;
}

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  costs: Pick<WritingEvaluationServiceOptions, "inputCostPerMillion" | "outputCostPerMillion">,
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

function containsChineseGuidance(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function containsUnsafeOutput(feedback: WritingFeedback): boolean {
  return /<script|sk-[a-z0-9_-]{16,}|system prompt|developer message/i.test(
    JSON.stringify(feedback),
  );
}
