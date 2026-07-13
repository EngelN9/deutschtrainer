import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { aiEvaluationFeedbackSchema } from "@deutschtrainer/ai-schemas";
import { SUPPORTED_LEVELS, type CefrLevel } from "@deutschtrainer/shared-types";
import { ApiError } from "../errors";
import type {
  AuthenticatedLearner,
  CachedEvaluation,
  EvaluationExercise,
  EvaluationRecordInput,
  EvaluationRecordResult,
  EvaluationRepository,
  StoredEvaluation,
  UsageLogInput,
} from "./types";

export class SupabaseEvaluationRepository implements EvaluationRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedLearner | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      return undefined;
    }

    const profileResult = await this.client
      .from("profiles")
      .select("id, timezone")
      .eq("auth_user_id", userResult.data.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(profileResult.error, "無法驗證學習者資料。");
    if (!profileResult.data) {
      return undefined;
    }

    return {
      authUserId: userResult.data.user.id,
      profileId: profileResult.data.id,
      timezone: profileResult.data.timezone,
    };
  }

  async findByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredEvaluation | undefined> {
    const feedbackResult = await this.client
      .from("ai_feedback")
      .select("id, attempt_id, feedback_json, model, cached_from_id")
      .eq("user_id", learnerId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertDatabaseResult(feedbackResult.error, "無法檢查重複的 AI 批改要求。");
    if (!feedbackResult.data) {
      return undefined;
    }

    const feedback = aiEvaluationFeedbackSchema.parse(feedbackResult.data.feedback_json);
    const attemptResult = await this.client
      .from("attempts")
      .select("lesson_id")
      .eq("id", feedbackResult.data.attempt_id)
      .single();
    assertDatabaseResult(attemptResult.error, "無法讀取既有 AI 作答紀錄。");
    if (!attemptResult.data) {
      throw new ApiError("DATABASE_ERROR", "既有 AI 作答紀錄不完整。", 500, true);
    }
    const progressResult = await this.client
      .from("lesson_progress")
      .select("completion_percent")
      .eq("user_id", learnerId)
      .eq("lesson_id", attemptResult.data.lesson_id)
      .maybeSingle();
    assertDatabaseResult(progressResult.error, "無法讀取 AI 作答進度。");

    return {
      attemptId: feedbackResult.data.attempt_id,
      feedbackId: feedbackResult.data.id,
      feedback,
      model: feedbackResult.data.model,
      cached: Boolean(feedbackResult.data.cached_from_id),
      completionPercent: Number(progressResult.data?.completion_percent ?? 0),
    };
  }

  async findCached(learnerId: string, cacheKey: string): Promise<CachedEvaluation | undefined> {
    const result = await this.client
      .from("ai_feedback")
      .select("id, feedback_json, model")
      .eq("user_id", learnerId)
      .eq("feature", "evaluate_response")
      .eq("cache_key", cacheKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法讀取 AI 批改快取。");
    if (!result.data) {
      return undefined;
    }

    return {
      feedbackId: result.data.id,
      feedback: aiEvaluationFeedbackSchema.parse(result.data.feedback_json),
      model: result.data.model,
    };
  }

  async getExercise(exerciseId: string): Promise<EvaluationExercise | undefined> {
    const exerciseResult = await this.client
      .from("exercises")
      .select(
        "id, activity_id, level, type, instruction_zh_tw, prompt_de, payload_json, skill_ids, version",
      )
      .eq("id", exerciseId)
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(exerciseResult.error, "無法讀取 AI 題目。");
    const row = exerciseResult.data;
    if (!row || (row.type !== "translation" && row.type !== "free_response")) {
      return undefined;
    }

    const activityResult = await this.client
      .from("activities")
      .select("lesson_id")
      .eq("id", row.activity_id)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(activityResult.error, "無法讀取 AI 題目所屬活動。");
    if (!activityResult.data) {
      return undefined;
    }

    const lessonResult = await this.client
      .from("lessons")
      .select("id")
      .eq("id", activityResult.data.lesson_id)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(lessonResult.error, "無法讀取 AI 題目所屬課堂。");
    if (!lessonResult.data || !isCefrLevel(row.level)) {
      return undefined;
    }

    const answerResult = await this.client
      .from("exercise_answers")
      .select("answer_json, explanation_zh_tw")
      .eq("exercise_id", row.id)
      .maybeSingle();
    assertDatabaseResult(answerResult.error, "無法讀取 AI 題目的批改規則。");
    if (!answerResult.data || row.skill_ids.length === 0) {
      return undefined;
    }

    const payload = asObject(row.payload_json);
    const answer = asObject(answerResult.data.answer_json);
    const promptZhTw = readString(payload, "promptZhTw");
    if (row.type === "translation" && !promptZhTw) {
      return undefined;
    }

    return {
      id: row.id,
      lessonId: activityResult.data.lesson_id,
      version: row.version,
      type: row.type,
      level: row.level,
      instructionZhTw: row.instruction_zh_tw,
      promptDe: row.prompt_de,
      ...(promptZhTw ? { promptZhTw } : {}),
      skillIds: row.skill_ids,
      referenceAnswersDe: readStringArray(answer, "referenceAnswersDe"),
      gradingNotesZhTw:
        readString(answer, "gradingNotesZhTw") || answerResult.data.explanation_zh_tw,
      minimumCharacters: readInteger(payload, "minimumCharacters", 10),
      maximumCharacters: readInteger(payload, "maximumCharacters", 800),
    };
  }

  async countRecentLogicalRequests(learnerId: string, since: string): Promise<number> {
    const result = await this.client
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", learnerId)
      .eq("feature", "evaluate_response")
      .eq("logical_request", true)
      .gte("created_at", since);
    assertDatabaseResult(result.error, "無法檢查 AI 使用額度。");
    return result.count ?? 0;
  }

  async recordEvaluation(input: EvaluationRecordInput): Promise<EvaluationRecordResult> {
    const result = await this.client.rpc("record_ai_attempt", {
      p_user_id: input.learner.profileId,
      p_exercise_id: input.exercise.id,
      p_response_de: input.request.responseDe,
      p_feedback_json: input.feedback,
      p_model: input.model,
      p_schema_version: input.schemaVersion,
      p_prompt_id: input.promptId,
      p_prompt_version: input.promptVersion,
      p_cache_key: input.cacheKey,
      p_idempotency_key: input.request.idempotencyKey,
      p_duration_ms: input.request.durationMs,
      p_used_hint: input.request.usedHint,
      p_mode: input.request.mode,
      p_review_id: input.request.reviewId ?? null,
      p_cached_from_id: input.cachedFromId ?? null,
    });
    assertDatabaseResult(result.error, "無法保存 AI 批改與學習進度。");
    const data = asObject(result.data);
    const attemptId = readString(data, "attemptId");
    const feedbackId = readString(data, "feedbackId");
    if (!attemptId || !feedbackId) {
      throw new ApiError("DATABASE_ERROR", "AI 批改紀錄不完整。", 500, true);
    }

    return {
      attemptId,
      feedbackId,
      completionPercent: readNumber(data, "completionPercent", 0),
      idempotentReplay: readBoolean(data, "idempotentReplay", false),
    };
  }

  async recordUsage(input: UsageLogInput): Promise<void> {
    const result = await this.client.from("ai_usage_logs").insert({
      user_id: input.learnerId,
      request_id: input.requestId,
      idempotency_key: input.idempotencyKey,
      feature: "evaluate_response",
      model: input.model,
      provider_request_id: input.providerRequestId ?? null,
      provider_attempt: input.providerAttempt,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      estimated_cost: input.estimatedCost,
      latency_ms: input.latencyMs,
      success: input.success,
      cached: input.cached,
      logical_request: input.logicalRequest,
      error_code: input.errorCode ?? null,
    });
    assertDatabaseResult(result.error, "無法保存 AI 成本紀錄。");
  }
}

function assertDatabaseResult(error: { message: string } | null, message: string): void {
  if (error) {
    throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
  }
}

function isCefrLevel(value: string): value is CefrLevel {
  return (SUPPORTED_LEVELS as readonly string[]).includes(value);
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function readInteger(record: Record<string, unknown>, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function readNumber(record: Record<string, unknown>, key: string, fallback: number): number {
  const value = record[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function readBoolean(record: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}
