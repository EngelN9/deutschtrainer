import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { conversationFeedbackSchema } from "@deutschtrainer/ai-schemas";
import { promptRegistry } from "@deutschtrainer/ai-prompts";
import {
  conversationListResponseSchema,
  conversationScenarioSchema,
  conversationSessionSchema,
  userRoleSchema,
  type ConversationListResponse,
  type ConversationScenario,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import type { AuthenticatedLearner } from "../evaluation/types";
import type {
  ConversationContext,
  ConversationRepository,
  ConversationUsageInput,
  ProtectedConversationScenario,
} from "./types";

export class SupabaseConversationRepository implements ConversationRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedLearner | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) return undefined;
    const profileResult = await this.client
      .from("profiles")
      .select("id, role, timezone")
      .eq("auth_user_id", userResult.data.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(profileResult.error, "無法驗證對話使用者。");
    if (!profileResult.data) return undefined;
    return {
      authUserId: userResult.data.user.id,
      emailVerified: Boolean(userResult.data.user.email_confirmed_at),
      profileId: profileResult.data.id,
      role: userRoleSchema.parse(profileResult.data.role),
      timezone: profileResult.data.timezone,
    };
  }

  async listScenarios(): Promise<ConversationScenario[]> {
    const result = await this.client
      .from("conversation_scenarios")
      .select("id, level, title_zh_tw, title_de, description_zh_tw, max_learner_turns, version")
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null)
      .order("level");
    assertDatabaseResult(result.error, "無法載入對話情境。");
    return (result.data ?? []).map(mapScenario);
  }

  async listSessions(learnerId: string): Promise<ConversationListResponse> {
    const result = await this.client
      .from("conversation_sessions")
      .select("id")
      .eq("user_id", learnerId)
      .order("updated_at", { ascending: false })
      .limit(100);
    assertDatabaseResult(result.error, "無法載入對話紀錄。");
    const contexts = await Promise.all(
      (result.data ?? []).map((row) => this.getContext(learnerId, row.id)),
    );
    return conversationListResponseSchema.parse({
      sessions: contexts
        .filter((context): context is ConversationContext => context !== undefined)
        .map(({ session }) => {
          const { messages: _messages, ...summary } = session;
          return summary;
        }),
    });
  }

  async getContext(learnerId: string, sessionId: string): Promise<ConversationContext | undefined> {
    const sessionResult = await this.client
      .from("conversation_sessions")
      .select(
        "id, user_id, scenario_id, status, learner_turn_count, retry_of_session_id, quota_reservation_id, quota_generation, provider_call_count, created_at, updated_at, completed_at",
      )
      .eq("id", sessionId)
      .eq("user_id", learnerId)
      .maybeSingle();
    assertDatabaseResult(sessionResult.error, "無法讀取對話紀錄。");
    if (!sessionResult.data) return undefined;
    const [scenarioResult, rulesResult, messagesResult, feedbackResult] = await Promise.all([
      this.client
        .from("conversation_scenarios")
        .select(
          "id, level, title_zh_tw, title_de, description_zh_tw, opening_message_de, max_learner_turns, version",
        )
        .eq("id", sessionResult.data.scenario_id)
        .single(),
      this.client
        .from("conversation_scenario_rules")
        .select("goals_json, evaluation_notes_zh_tw, allowed_skill_ids")
        .eq("scenario_id", sessionResult.data.scenario_id)
        .single(),
      this.client
        .from("conversation_messages")
        .select("id, role, sequence_number, content, created_at")
        .eq("session_id", sessionId)
        .eq("user_id", learnerId)
        .order("sequence_number"),
      this.client
        .from("conversation_feedback")
        .select("feedback_json")
        .eq("session_id", sessionId)
        .eq("user_id", learnerId)
        .maybeSingle(),
    ]);
    assertFirstDatabaseError(
      [scenarioResult.error, rulesResult.error, messagesResult.error, feedbackResult.error],
      "對話資料不完整。",
    );
    if (!scenarioResult.data || !rulesResult.data) {
      throw new ApiError("DATABASE_ERROR", "對話情境資料不完整。", 500, true);
    }
    const scenario: ProtectedConversationScenario = {
      ...mapScenario(scenarioResult.data),
      openingMessageDe: scenarioResult.data.opening_message_de,
      goals: readStringArray(rulesResult.data.goals_json),
      evaluationNotesZhTw: rulesResult.data.evaluation_notes_zh_tw,
      allowedSkillIds: rulesResult.data.allowed_skill_ids,
    };
    const session = conversationSessionSchema.parse({
      id: sessionResult.data.id,
      scenario,
      status: sessionResult.data.status,
      learnerTurnCount: sessionResult.data.learner_turn_count,
      retryOfSessionId: sessionResult.data.retry_of_session_id,
      createdAt: sessionResult.data.created_at,
      updatedAt: sessionResult.data.updated_at,
      completedAt: sessionResult.data.completed_at,
      messages: (messagesResult.data ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        sequenceNumber: message.sequence_number,
        content: message.content,
        createdAt: message.created_at,
      })),
      feedback: feedbackResult.data
        ? conversationFeedbackSchema.parse(feedbackResult.data.feedback_json)
        : null,
    });
    return {
      session,
      scenario,
      quotaReservation: {
        id: sessionResult.data.quota_reservation_id,
        generation: sessionResult.data.quota_generation,
      },
      providerCallCount: sessionResult.data.provider_call_count,
    };
  }

  async findSessionByIdempotency(learnerId: string, idempotencyKey: string) {
    const result = await this.client
      .from("conversation_sessions")
      .select("id")
      .eq("user_id", learnerId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法檢查重複對話要求。");
    if (!result.data) return undefined;
    return (await this.getContext(learnerId, result.data.id))?.session;
  }

  async hasMessageIdempotency(sessionId: string, idempotencyKey: string): Promise<boolean> {
    const result = await this.client
      .from("conversation_messages")
      .select("id")
      .eq("session_id", sessionId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法檢查重複對話訊息。");
    return Boolean(result.data);
  }

  async createSession(input: Parameters<ConversationRepository["createSession"]>[0]) {
    const result = await this.client.rpc("create_conversation_session_service", {
      p_user_id: input.learnerId,
      p_scenario_id: input.request.scenarioId,
      p_idempotency_key: input.request.idempotencyKey,
      p_quota_reservation_id: input.reservation.id,
      p_quota_generation: input.reservation.generation,
      p_retry_of_session_id: input.request.retryOfSessionId ?? null,
    });
    if (result.error?.code === "23505") {
      throw new ApiError("CONFLICT", "同一時間只能進行一場對話。", 409, false);
    }
    assertDatabaseResult(result.error, "無法建立對話。");
    if (typeof result.data !== "string") {
      throw new ApiError("DATABASE_ERROR", "對話建立結果不完整。", 500, true);
    }
    return result.data;
  }

  async appendTurn(input: Parameters<ConversationRepository["appendTurn"]>[0]) {
    const result = await this.client.rpc("append_conversation_turn_service", {
      p_user_id: input.learnerId,
      p_session_id: input.sessionId,
      p_expected_learner_turn: input.expectedLearnerTurn,
      p_idempotency_key: input.idempotencyKey,
      p_user_content: input.userContent,
      p_assistant_content: input.assistantContent,
    });
    if (result.error?.code === "40001") {
      throw new ApiError("CONFLICT", "對話已由另一個要求更新，請重新載入。", 409, true);
    }
    assertDatabaseResult(result.error, "無法保存對話訊息。");
  }

  async completeSession(input: Parameters<ConversationRepository["completeSession"]>[0]) {
    const prompt = promptRegistry.conversationFeedbackV1;
    const result = await this.client.rpc("complete_conversation_session_service", {
      p_user_id: input.learnerId,
      p_session_id: input.sessionId,
      p_feedback: input.feedback,
      p_model: input.model,
      p_schema_version: "ConversationFeedback.v1",
      p_prompt_id: prompt.id,
      p_prompt_version: prompt.version,
    });
    assertDatabaseResult(result.error, "無法完成對話。");
  }

  async failSession(learnerId: string, sessionId: string) {
    const result = await this.client.rpc("fail_conversation_session_service", {
      p_user_id: learnerId,
      p_session_id: sessionId,
    });
    assertDatabaseResult(result.error, "無法更新失敗的對話。");
  }

  async deleteSession(learnerId: string, sessionId: string) {
    const result = await this.client.rpc("delete_conversation_session_service", {
      p_user_id: learnerId,
      p_session_id: sessionId,
    });
    if (result.error?.code === "42501") {
      throw new ApiError("NOT_FOUND", "找不到可刪除的對話。", 404, false);
    }
    assertDatabaseResult(result.error, "無法刪除對話。");
  }

  async recordUsage(input: ConversationUsageInput) {
    const result = await this.client.from("ai_usage_logs").insert({
      user_id: input.learnerId,
      request_id: `${input.sessionId}:${input.idempotencyKey}`,
      idempotency_key: input.idempotencyKey,
      feature: "conversation",
      model: input.model,
      provider_request_id: input.providerRequestId ?? null,
      provider_attempt: input.providerAttempt,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      estimated_cost: 0,
      latency_ms: input.latencyMs,
      success: input.success,
      cached: false,
      logical_request: input.providerAttempt === 1,
      error_code: input.errorCode ?? null,
    });
    assertDatabaseResult(result.error, "無法記錄對話 AI 使用量。");
  }
}

function mapScenario(row: Record<string, unknown>): ConversationScenario {
  return conversationScenarioSchema.parse({
    id: row.id,
    level: row.level,
    titleZhTw: row.title_zh_tw,
    titleDe: row.title_de,
    descriptionZhTw: row.description_zh_tw,
    maxLearnerTurns: row.max_learner_turns,
    version: row.version,
  });
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ApiError("DATABASE_ERROR", "對話內部規則格式不正確。", 500, false);
  }
  return value;
}

function assertFirstDatabaseError(
  errors: Array<{ code?: string; message?: string } | null>,
  message: string,
) {
  assertDatabaseResult(errors.find((error) => error !== null) ?? null, message);
}

function assertDatabaseResult(error: { code?: string; message?: string } | null, message: string) {
  if (!error) return;
  if (error.code === "42501") throw new ApiError("FORBIDDEN", message, 403, false);
  if (error.code === "22023") throw new ApiError("VALIDATION_ERROR", message, 400, false);
  throw new ApiError("DATABASE_ERROR", message, 500, true);
}
