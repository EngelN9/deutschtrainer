import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generatedExerciseDraftSchema } from "@deutschtrainer/ai-schemas";
import {
  SUPPORTED_LEVELS,
  type CefrLevel,
  type ContentTeamRole,
} from "@deutschtrainer/shared-types";
import type { GenerateExerciseDraftRequest } from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import type {
  AuthenticatedContentUser,
  ContentGenerationRepository,
  GenerationActivityContext,
  GenerationRecordResult,
  GenerationUsageInput,
  PersistedGeneratedExerciseDraft,
  StoredGeneration,
} from "./types";

export class SupabaseContentGenerationRepository implements ContentGenerationRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedContentUser | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      return undefined;
    }
    const profileResult = await this.client
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", userResult.data.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(profileResult.error, "無法驗證內容管理者資料。");
    if (!profileResult.data || !isContentTeamRole(profileResult.data.role)) {
      return undefined;
    }
    return {
      authUserId: userResult.data.user.id,
      profileId: profileResult.data.id,
      role: profileResult.data.role,
    };
  }

  async getActivityContext(
    activityId: string,
    targetSkillIds: string[],
  ): Promise<GenerationActivityContext | undefined> {
    const activityResult = await this.client
      .from("activities")
      .select("id, lesson_id")
      .eq("id", activityId)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(activityResult.error, "無法讀取題目所屬活動。");
    if (!activityResult.data) {
      return undefined;
    }
    const lessonResult = await this.client
      .from("lessons")
      .select("id, level")
      .eq("id", activityResult.data.lesson_id)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(lessonResult.error, "無法讀取題目所屬課堂。");
    if (!lessonResult.data || !isCefrLevel(lessonResult.data.level)) {
      return undefined;
    }
    const skillsResult = await this.client.from("skills").select("code").in("code", targetSkillIds);
    assertDatabaseResult(skillsResult.error, "無法驗證題目技能。");
    return {
      activityId: activityResult.data.id,
      lessonId: lessonResult.data.id,
      level: lessonResult.data.level,
      skillCodes: (skillsResult.data ?? []).map((row) => row.code),
    };
  }

  async findByIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<StoredGeneration | undefined> {
    const result = await this.client
      .from("ai_generation_jobs")
      .select("id, output_json")
      .eq("requested_by", userId)
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "completed")
      .maybeSingle();
    assertDatabaseResult(result.error, "無法檢查重複的 AI 草稿要求。");
    if (!result.data) {
      return undefined;
    }
    const output = asObject(result.data.output_json);
    const rawDraft = asObject(output.draft);
    return {
      jobId: result.data.id,
      exerciseId: requireString(output, "exerciseId"),
      contentVersionId: requireString(output, "contentVersionId"),
      draft: generatedExerciseDraftSchema.parse({
        type: rawDraft.type,
        titleZhTw: rawDraft.titleZhTw,
        instructionZhTw: rawDraft.instructionZhTw,
        promptDe: rawDraft.promptDe,
        estimatedSeconds: rawDraft.estimatedSeconds,
        difficulty: rawDraft.difficulty,
        options: Array.isArray(rawDraft.options)
          ? rawDraft.options.map((entry) => {
              const option = asObject(entry);
              return {
                label: option.label,
                textDe: option.textDe,
                textZhTw: option.textZhTw ?? null,
                isCorrect: option.isCorrect,
              };
            })
          : [],
        acceptedAnswers: rawDraft.acceptedAnswers,
        explanationZhTw: rawDraft.explanationZhTw ?? null,
        validationNotes: rawDraft.validationNotes,
        requiresHumanReview: rawDraft.requiresHumanReview,
      }),
    };
  }

  async countRecentLogicalRequests(userId: string, since: string): Promise<number> {
    const result = await this.client
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", "generate_content")
      .eq("logical_request", true)
      .gte("created_at", since);
    assertDatabaseResult(result.error, "無法檢查 AI 草稿額度。");
    return result.count ?? 0;
  }

  async createJob(
    user: AuthenticatedContentUser,
    request: GenerateExerciseDraftRequest,
  ): Promise<string> {
    const result = await this.client
      .from("ai_generation_jobs")
      .insert({
        requested_by: user.profileId,
        activity_id: request.activityId,
        level: request.level,
        exercise_type: request.type,
        topic_zh_tw: request.topicZhTw,
        target_skill_ids: request.targetSkillIds,
        request_json: request,
        status: "processing",
        idempotency_key: request.idempotencyKey,
      })
      .select("id")
      .single();
    assertDatabaseResult(result.error, "無法建立 AI 草稿工作。");
    if (!result.data) {
      throw new ApiError("DATABASE_ERROR", "AI 草稿工作未建立。", 500, true);
    }
    return result.data.id;
  }

  async recordDraft(
    jobId: string,
    draft: PersistedGeneratedExerciseDraft,
    model: string,
    providerRequestId?: string,
  ): Promise<GenerationRecordResult> {
    const result = await this.client.rpc("admin_record_ai_exercise_draft", {
      p_job_id: jobId,
      p_draft: draft,
      p_model: model,
      p_provider_request_id: providerRequestId ?? null,
    });
    assertDatabaseResult(result.error, "無法保存 AI 題目草稿。");
    const data = asObject(result.data);
    return {
      jobId: requireString(data, "jobId"),
      exerciseId: requireString(data, "exerciseId"),
      contentVersionId: requireString(data, "contentVersionId"),
      status: "draft",
      reviewStatus: "draft",
      sourceType: "ai_generated",
    };
  }

  async markJobFailed(jobId: string, errorCode: string, issues: string[]): Promise<void> {
    const result = await this.client
      .from("ai_generation_jobs")
      .update({
        status: "failed",
        error_code: errorCode,
        validation_errors_json: issues,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    assertDatabaseResult(result.error, "無法保存 AI 草稿失敗狀態。");
  }

  async recordUsage(input: GenerationUsageInput): Promise<void> {
    const result = await this.client.from("ai_usage_logs").insert({
      user_id: input.userId,
      request_id: input.requestId,
      idempotency_key: input.idempotencyKey,
      feature: "generate_content",
      model: input.model,
      provider_request_id: input.providerRequestId ?? null,
      provider_attempt: input.providerAttempt,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      estimated_cost: input.estimatedCost,
      latency_ms: input.latencyMs,
      success: input.success,
      cached: false,
      logical_request: input.logicalRequest,
      error_code: input.errorCode ?? null,
    });
    assertDatabaseResult(result.error, "無法保存 AI 草稿用量。");
  }
}

function isContentTeamRole(value: string): value is ContentTeamRole {
  return value === "content_editor" || value === "reviewer" || value === "admin";
}

function isCefrLevel(value: string): value is CefrLevel {
  return (SUPPORTED_LEVELS as readonly string[]).includes(value);
}

function assertDatabaseResult(error: { message: string } | null, message: string): void {
  if (error) {
    throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError("DATABASE_ERROR", `AI 草稿缺少 ${key}。`, 500, true);
  }
  return value;
}
