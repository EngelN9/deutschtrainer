import {
  conversationFeedbackJsonSchema,
  conversationFeedbackSchema,
  conversationTurnJsonSchema,
  conversationTurnSchema,
} from "@deutschtrainer/ai-schemas";
import {
  buildConversationFeedbackPrompt,
  buildConversationTurnPrompt,
} from "@deutschtrainer/ai-prompts";
import type {
  CompleteConversationRequest,
  CompleteConversationResponse,
  ConversationDetailResponse,
  ConversationListResponse,
  ConversationScenarioListResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  DeleteConversationResponse,
  SendConversationMessageRequest,
  SendConversationMessageResponse,
} from "@deutschtrainer/validation";
import type { AiQuotaGate } from "../ai-quota/types";
import { ApiError } from "../errors";
import type { AuthenticatedLearner } from "../evaluation/types";
import { PrivateRequestRateLimiter } from "../privateRequestRateLimiter";
import {
  ConversationProviderError,
  type ConversationProviderErrorCode,
} from "./openAiConversationProvider";
import type {
  ConversationContext,
  ConversationProvider,
  ConversationRepository,
  ConversationServiceContract,
  ConversationUsageInput,
} from "./types";
import { toPromptHistory } from "./types";

interface ConversationServiceOptions {
  repository: ConversationRepository;
  provider: ConversationProvider;
  quotaGate: AiQuotaGate;
  publicEnabled: boolean;
  dailyLimit: number;
  rateLimiter?: PrivateRequestRateLimiter;
  privateRequestsPerMinute?: number;
}

export class ConversationService implements ConversationServiceContract {
  private readonly rateLimiter: PrivateRequestRateLimiter;

  constructor(private readonly options: ConversationServiceOptions) {
    this.rateLimiter =
      options.rateLimiter ??
      new PrivateRequestRateLimiter(options.privateRequestsPerMinute ?? 60, () => new Date());
  }

  async listScenarios(accessToken: string): Promise<ConversationScenarioListResponse> {
    const learner = await this.requireLearner(accessToken);
    if (!this.options.publicEnabled) return { enabled: false, scenarios: [] };
    this.options.quotaGate.assertEligible(learner);
    return { enabled: true, scenarios: await this.options.repository.listScenarios() };
  }

  async listSessions(accessToken: string): Promise<ConversationListResponse> {
    const learner = await this.requireLearner(accessToken);
    return this.options.repository.listSessions(learner.profileId);
  }

  async getSession(accessToken: string, sessionId: string): Promise<ConversationDetailResponse> {
    const learner = await this.requireLearner(accessToken);
    const context = await this.requireContext(learner.profileId, sessionId);
    return { session: context.session };
  }

  async createSession(
    accessToken: string,
    request: CreateConversationRequest,
  ): Promise<CreateConversationResponse> {
    const learner = await this.requireEnabledLearner(accessToken);
    const existing = await this.options.repository.findSessionByIdempotency(
      learner.profileId,
      request.idempotencyKey,
    );
    if (existing) return { session: existing, idempotentReplay: true };

    const reservation = await this.options.quotaGate.reserve({
      feature: "conversation",
      idempotencyKey: request.idempotencyKey,
      learnerId: learner.profileId,
      limit: this.options.dailyLimit,
    });
    try {
      const sessionId = await this.options.repository.createSession({
        learnerId: learner.profileId,
        request,
        reservation,
      });
      const context = await this.requireContext(learner.profileId, sessionId);
      return { session: context.session, idempotentReplay: false };
    } catch (error) {
      await this.options.quotaGate.release(reservation);
      throw error;
    }
  }

  async sendMessage(
    accessToken: string,
    sessionId: string,
    request: SendConversationMessageRequest,
  ): Promise<SendConversationMessageResponse> {
    const learner = await this.requireEnabledLearner(accessToken);
    let context = await this.requireContext(learner.profileId, sessionId);
    if (await this.options.repository.hasMessageIdempotency(sessionId, request.idempotencyKey)) {
      return { session: context.session, idempotentReplay: true };
    }
    if (
      context.session.status !== "active" ||
      context.session.learnerTurnCount !== request.expectedLearnerTurn ||
      context.session.learnerTurnCount >= 6
    ) {
      throw new ApiError("CONFLICT", "對話輪次已變更，請重新載入後再送出。", 409, true);
    }

    const providerAttempt = context.providerCallCount + 1;
    await this.options.quotaGate.reserveProviderCall(context.quotaReservation, providerAttempt);
    try {
      const result = await this.options.provider.continueConversation({
        messages: buildConversationTurnPrompt({
          level: context.scenario.level,
          scenarioTitleDe: context.scenario.titleDe,
          goals: context.scenario.goals,
          history: toPromptHistory(context.session),
          learnerMessageDe: request.contentDe,
          remainingLearnerTurns: 5 - context.session.learnerTurnCount,
        }),
        jsonSchema: structuredClone(conversationTurnJsonSchema) as Record<string, unknown>,
      });
      const turn = conversationTurnSchema.parse(result.payload);
      await this.options.repository.appendTurn({
        learnerId: learner.profileId,
        sessionId,
        expectedLearnerTurn: request.expectedLearnerTurn,
        idempotencyKey: request.idempotencyKey,
        userContent: request.contentDe,
        assistantContent: turn.replyDe,
      });
      await this.recordUsage({
        learnerId: learner.profileId,
        sessionId,
        idempotencyKey: request.idempotencyKey,
        providerAttempt,
        result,
      });
      context = await this.requireContext(learner.profileId, sessionId);
      return { session: context.session, idempotentReplay: false };
    } catch (error) {
      await this.failConversation(
        learner.profileId,
        context,
        request.idempotencyKey,
        providerAttempt,
        error,
      );
      throw toConversationApiError(error);
    }
  }

  async completeSession(
    accessToken: string,
    sessionId: string,
    request: CompleteConversationRequest,
  ): Promise<CompleteConversationResponse> {
    const learner = await this.requireEnabledLearner(accessToken);
    let context = await this.requireContext(learner.profileId, sessionId);
    if (context.session.status === "completed") {
      return { session: context.session, idempotentReplay: true };
    }
    if (context.session.status !== "active" || context.session.learnerTurnCount < 1) {
      throw new ApiError("CONFLICT", "至少完成一輪對話後才能取得回饋。", 409, false);
    }
    const providerAttempt = context.providerCallCount + 1;
    await this.options.quotaGate.reserveProviderCall(context.quotaReservation, providerAttempt);
    try {
      const result = await this.options.provider.evaluateConversation({
        messages: buildConversationFeedbackPrompt({
          level: context.scenario.level,
          scenarioTitleDe: context.scenario.titleDe,
          goals: context.scenario.goals,
          evaluationNotesZhTw: context.scenario.evaluationNotesZhTw,
          history: toPromptHistory(context.session),
        }),
        jsonSchema: structuredClone(conversationFeedbackJsonSchema) as Record<string, unknown>,
      });
      const feedback = conversationFeedbackSchema.parse(result.payload);
      await this.options.repository.completeSession({
        learnerId: learner.profileId,
        sessionId,
        feedback,
        model: result.model,
      });
      await this.options.quotaGate.consume(context.quotaReservation);
      await this.recordUsage({
        learnerId: learner.profileId,
        sessionId,
        idempotencyKey: request.idempotencyKey,
        providerAttempt,
        result,
      });
      context = await this.requireContext(learner.profileId, sessionId);
      return { session: context.session, idempotentReplay: false };
    } catch (error) {
      await this.failConversation(
        learner.profileId,
        context,
        request.idempotencyKey,
        providerAttempt,
        error,
      );
      throw toConversationApiError(error);
    }
  }

  async deleteSession(accessToken: string, sessionId: string): Promise<DeleteConversationResponse> {
    const learner = await this.requireLearner(accessToken);
    await this.options.repository.deleteSession(learner.profileId, sessionId);
    return { requestId: `conversation-delete:${sessionId}`, deleted: true };
  }

  private async requireEnabledLearner(accessToken: string) {
    const learner = await this.requireLearner(accessToken);
    if (!this.options.publicEnabled) {
      throw new ApiError("AI_GLOBALLY_DISABLED", "文字對話公測目前尚未啟用。", 503, false);
    }
    if (!this.options.provider.configured) {
      throw new ApiError("AI_NOT_CONFIGURED", "伺服器尚未設定 AI 對話服務。", 503, false);
    }
    this.options.quotaGate.assertEligible(learner);
    return learner;
  }

  private async requireLearner(accessToken: string): Promise<AuthenticatedLearner> {
    const learner = await this.options.repository.authenticate(accessToken);
    if (!learner) throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    this.rateLimiter.assertAllowed(learner.profileId);
    return learner;
  }

  private async requireContext(learnerId: string, sessionId: string) {
    const context = await this.options.repository.getContext(learnerId, sessionId);
    if (!context) throw new ApiError("NOT_FOUND", "找不到這場對話。", 404, false);
    return context;
  }

  private async recordUsage(input: {
    learnerId: string;
    sessionId: string;
    idempotencyKey: string;
    providerAttempt: number;
    result: {
      model: string;
      providerRequestId?: string;
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
    };
  }) {
    await this.options.repository.recordUsage({
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      idempotencyKey: input.idempotencyKey,
      model: input.result.model,
      ...(input.result.providerRequestId
        ? { providerRequestId: input.result.providerRequestId }
        : {}),
      providerAttempt: input.providerAttempt,
      inputTokens: input.result.inputTokens,
      outputTokens: input.result.outputTokens,
      latencyMs: input.result.latencyMs,
      success: true,
    });
  }

  private async failConversation(
    learnerId: string,
    context: ConversationContext,
    idempotencyKey: string,
    providerAttempt: number,
    error: unknown,
  ) {
    const providerError = toConversationApiError(error);
    const usage: ConversationUsageInput = {
      learnerId,
      sessionId: context.session.id,
      idempotencyKey,
      model: this.options.provider.model,
      providerAttempt,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      success: false,
      errorCode: providerError.code,
    };
    await Promise.allSettled([
      this.options.repository.recordUsage(usage),
      this.options.repository.failSession(learnerId, context.session.id),
      this.options.quotaGate.release(context.quotaReservation),
    ]);
  }
}

function toConversationApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ConversationProviderError) {
    return new ApiError(
      error.code as ConversationProviderErrorCode,
      error.message,
      503,
      error.retryable,
    );
  }
  return new ApiError("AI_RESPONSE_INVALID", "AI 對話回應無法安全處理。", 502, true);
}
