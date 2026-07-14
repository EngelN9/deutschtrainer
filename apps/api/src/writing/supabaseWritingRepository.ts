import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writingFeedbackSchema, type WritingFeedback } from "@deutschtrainer/ai-schemas";
import {
  SUPPORTED_LEVELS,
  WRITING_TYPES,
  type CefrLevel,
  type WritingType,
} from "@deutschtrainer/shared-types";
import {
  writingDiffChangeSchema,
  writingWorkspaceResponseSchema,
  type WritingWorkspaceResponse,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import type { AuthenticatedLearner } from "../evaluation/types";
import type {
  PreparedWritingVersion,
  PrepareWritingVersionInput,
  ProtectedWritingPrompt,
  StoredWritingVersion,
  WritingFeedbackRecordInput,
  WritingFeedbackRecordResult,
  WritingRepository,
  WritingSubmissionContext,
  WritingUsageLogInput,
} from "./types";

interface LoadedFeedback {
  feedbackId: string;
  feedback: WritingFeedback;
  model: string;
}

interface WritingPromptRow {
  id: string;
  lesson_id: string;
  level: CefrLevel;
  writing_type: WritingType;
  title_zh_tw: string;
  prompt_de: string;
  prompt_zh_tw: string;
  requirements_json: unknown;
  minimum_words: number;
  maximum_words: number;
  estimated_minutes: number;
  skill_ids: string[];
  version: number;
}

interface WritingSubmissionRow {
  id: string;
  user_id: string;
  lesson_id: string;
  prompt_id: string;
  level: CefrLevel;
  writing_type: WritingType;
  status: WritingWorkspaceResponse["submissions"][number]["status"];
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WritingVersionRow {
  id: string;
  submission_id: string;
  previous_version_id: string | null;
  version_number: number;
  text_de: string;
  word_count: number;
  diff_json: unknown;
  idempotency_key: string;
  ai_feedback_id: string | null;
  created_at: string;
}

interface WorkspaceFeedbackRow {
  id: string;
  target_id: string;
  feedback_json: unknown;
}

export class SupabaseWritingRepository implements WritingRepository {
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

  async getWorkspace(learnerId: string): Promise<WritingWorkspaceResponse> {
    const [promptsResult, submissionsResult, versionsResult, feedbackResult] = await Promise.all([
      this.client
        .from("writing_prompts")
        .select(
          "id, lesson_id, level, writing_type, title_zh_tw, prompt_de, prompt_zh_tw, requirements_json, minimum_words, maximum_words, estimated_minutes, skill_ids, version",
        )
        .eq("status", "published")
        .eq("review_status", "approved")
        .is("deleted_at", null)
        .order("level")
        .limit(100),
      this.client
        .from("writing_submissions")
        .select(
          "id, user_id, lesson_id, prompt_id, level, writing_type, status, current_version_id, created_at, updated_at",
        )
        .eq("user_id", learnerId)
        .order("updated_at", { ascending: false })
        .limit(100),
      this.client
        .from("writing_versions")
        .select(
          "id, submission_id, previous_version_id, version_number, text_de, word_count, diff_json, idempotency_key, ai_feedback_id, created_at",
        )
        .eq("user_id", learnerId)
        .order("version_number")
        .limit(1000),
      this.client
        .from("ai_feedback")
        .select("id, target_id, feedback_json")
        .eq("user_id", learnerId)
        .eq("feature", "evaluate_writing")
        .limit(1000),
    ]);
    assertFirstDatabaseError(
      [promptsResult.error, submissionsResult.error, versionsResult.error, feedbackResult.error],
      "無法載入作文工作區。",
    );

    const feedbackByVersion = new Map(
      ((feedbackResult.data ?? []) as WorkspaceFeedbackRow[]).map((row) => [row.target_id, row]),
    );
    const versionsBySubmission = groupBy(
      (versionsResult.data ?? []) as WritingVersionRow[],
      (row) => row.submission_id,
    );
    return writingWorkspaceResponseSchema.parse({
      prompts: ((promptsResult.data ?? []) as WritingPromptRow[]).map(mapWorkspacePrompt),
      submissions: ((submissionsResult.data ?? []) as WritingSubmissionRow[]).map((submission) =>
        mapWorkspaceSubmission(
          submission,
          versionsBySubmission.get(submission.id) ?? [],
          feedbackByVersion,
        ),
      ),
    });
  }

  async findByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredWritingVersion | undefined> {
    const versionResult = await this.client
      .from("writing_versions")
      .select(
        "id, submission_id, previous_version_id, version_number, text_de, word_count, diff_json, ai_feedback_id",
      )
      .eq("user_id", learnerId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertDatabaseResult(versionResult.error, "無法檢查重複的作文批改要求。");
    if (!versionResult.data) {
      return undefined;
    }

    const submissionResult = await this.client
      .from("writing_submissions")
      .select("prompt_id")
      .eq("id", versionResult.data.submission_id)
      .eq("user_id", learnerId)
      .single();
    assertDatabaseResult(submissionResult.error, "無法讀取作文提交紀錄。");
    if (!submissionResult.data) {
      throw new ApiError("DATABASE_ERROR", "作文提交紀錄不完整。", 500, true);
    }

    const feedback = versionResult.data.ai_feedback_id
      ? await this.loadFeedback(learnerId, versionResult.data.ai_feedback_id)
      : undefined;
    const previousFeedback = versionResult.data.previous_version_id
      ? await this.loadVersionFeedback(learnerId, versionResult.data.previous_version_id)
      : undefined;

    return {
      promptId: submissionResult.data.prompt_id,
      submissionId: versionResult.data.submission_id,
      versionId: versionResult.data.id,
      versionNumber: versionResult.data.version_number,
      ...(versionResult.data.previous_version_id
        ? { previousVersionId: versionResult.data.previous_version_id }
        : {}),
      textDe: versionResult.data.text_de,
      wordCount: versionResult.data.word_count,
      diff: writingDiffChangeSchema.array().parse(versionResult.data.diff_json),
      ...(feedback
        ? {
            feedbackId: feedback.feedbackId,
            feedback: feedback.feedback,
            model: feedback.model,
          }
        : {}),
      ...(previousFeedback ? { previousFeedback: previousFeedback.feedback } : {}),
    };
  }

  async getPrompt(promptId: string): Promise<ProtectedWritingPrompt | undefined> {
    const promptResult = await this.client
      .from("writing_prompts")
      .select(
        "id, lesson_id, level, writing_type, title_zh_tw, prompt_de, prompt_zh_tw, requirements_json, minimum_words, maximum_words, estimated_minutes, skill_ids, version",
      )
      .eq("id", promptId)
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(promptResult.error, "無法讀取作文題目。");
    const row = promptResult.data;
    if (!row || !isCefrLevel(row.level) || !isWritingType(row.writing_type)) {
      return undefined;
    }

    const rulesResult = await this.client
      .from("writing_prompt_rules")
      .select("grading_notes_zh_tw, reference_outline_json, reference_version_de")
      .eq("prompt_id", promptId)
      .maybeSingle();
    assertDatabaseResult(rulesResult.error, "無法讀取作文評分規則。");
    if (!rulesResult.data) {
      return undefined;
    }

    const requirements = readStringArray(row.requirements_json);
    const referenceOutline = readStringArray(rulesResult.data.reference_outline_json);
    if (requirements.length === 0 || referenceOutline.length === 0 || row.skill_ids.length === 0) {
      return undefined;
    }

    return {
      id: row.id,
      lessonId: row.lesson_id,
      level: row.level,
      writingType: row.writing_type,
      titleZhTw: row.title_zh_tw,
      promptDe: row.prompt_de,
      promptZhTw: row.prompt_zh_tw,
      requirementsZhTw: requirements,
      minimumWords: row.minimum_words,
      maximumWords: row.maximum_words,
      estimatedMinutes: row.estimated_minutes,
      skillIds: row.skill_ids,
      version: row.version,
      gradingNotesZhTw: rulesResult.data.grading_notes_zh_tw,
      referenceOutlineZhTw: referenceOutline,
      referenceVersionDe: rulesResult.data.reference_version_de,
    };
  }

  async getSubmissionContext(
    learnerId: string,
    submissionId: string,
  ): Promise<WritingSubmissionContext | undefined> {
    const submissionResult = await this.client
      .from("writing_submissions")
      .select("id, prompt_id, current_version_id")
      .eq("id", submissionId)
      .eq("user_id", learnerId)
      .maybeSingle();
    assertDatabaseResult(submissionResult.error, "無法讀取作文提交紀錄。");
    const submission = submissionResult.data;
    if (!submission?.current_version_id) {
      return undefined;
    }

    const versionResult = await this.client
      .from("writing_versions")
      .select("id, version_number, text_de, ai_feedback_id")
      .eq("id", submission.current_version_id)
      .eq("user_id", learnerId)
      .single();
    assertDatabaseResult(versionResult.error, "無法讀取目前的作文版本。");
    if (!versionResult.data) {
      return undefined;
    }

    const feedback = versionResult.data.ai_feedback_id
      ? await this.loadFeedback(learnerId, versionResult.data.ai_feedback_id)
      : undefined;
    return {
      submissionId: submission.id,
      promptId: submission.prompt_id,
      currentVersionId: versionResult.data.id,
      currentVersionNumber: versionResult.data.version_number,
      currentTextDe: versionResult.data.text_de,
      ...(feedback ? { currentFeedback: feedback.feedback } : {}),
    };
  }

  async countRecentLogicalRequests(learnerId: string, since: string): Promise<number> {
    const result = await this.client
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", learnerId)
      .eq("feature", "evaluate_writing")
      .eq("logical_request", true)
      .gte("created_at", since);
    assertDatabaseResult(result.error, "無法檢查作文 AI 使用額度。");
    return result.count ?? 0;
  }

  async prepareVersion(input: PrepareWritingVersionInput): Promise<PreparedWritingVersion> {
    const result = await this.client.rpc("prepare_writing_version", {
      p_user_id: input.learner.profileId,
      p_prompt_id: input.prompt.id,
      p_submission_id: input.submissionId ?? null,
      p_expected_current_version_id: input.expectedCurrentVersionId ?? null,
      p_text_de: input.textDe,
      p_word_count: input.wordCount,
      p_diff_json: input.diff,
      p_idempotency_key: input.idempotencyKey,
    });
    assertDatabaseResult(result.error, "無法保存作文版本。");
    const data = asObject(result.data);
    const submissionId = readString(data, "submissionId");
    const versionId = readString(data, "versionId");
    const versionNumber = readInteger(data, "versionNumber");
    const previousVersionId = readString(data, "previousVersionId");
    if (!submissionId || !versionId || versionNumber < 1) {
      throw new ApiError("DATABASE_ERROR", "作文版本紀錄不完整。", 500, true);
    }

    return {
      submissionId,
      versionId,
      versionNumber,
      ...(previousVersionId ? { previousVersionId } : {}),
      created: readBoolean(data, "created", false),
    };
  }

  async recordFeedback(input: WritingFeedbackRecordInput): Promise<WritingFeedbackRecordResult> {
    const result = await this.client.rpc("record_writing_feedback", {
      p_user_id: input.learnerId,
      p_version_id: input.versionId,
      p_feedback_json: input.feedback,
      p_model: input.model,
      p_schema_version: input.schemaVersion,
      p_prompt_id: input.promptId,
      p_prompt_version: input.promptVersion,
    });
    assertDatabaseResult(result.error, "無法保存作文 AI 回饋。");
    const data = asObject(result.data);
    const feedbackId = readString(data, "feedbackId");
    if (!feedbackId) {
      throw new ApiError("DATABASE_ERROR", "作文 AI 回饋紀錄不完整。", 500, true);
    }
    return {
      feedbackId,
      idempotentReplay: readBoolean(data, "idempotentReplay", false),
    };
  }

  async markEvaluationFailed(learnerId: string, versionId: string): Promise<void> {
    const result = await this.client.rpc("mark_writing_evaluation_failed", {
      p_user_id: learnerId,
      p_version_id: versionId,
    });
    assertDatabaseResult(result.error, "無法更新作文批改狀態。");
  }

  async recordUsage(input: WritingUsageLogInput): Promise<void> {
    const result = await this.client.from("ai_usage_logs").insert({
      user_id: input.learnerId,
      request_id: input.requestId,
      idempotency_key: input.idempotencyKey,
      feature: "evaluate_writing",
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
    assertDatabaseResult(result.error, "無法保存作文 AI 成本紀錄。");
  }

  async deleteSubmission(learnerId: string, submissionId: string): Promise<void> {
    const result = await this.client.rpc("delete_writing_submission_service", {
      p_user_id: learnerId,
      p_submission_id: submissionId,
    });
    if (result.error?.code === "22023") {
      throw new ApiError("NOT_FOUND", "找不到可刪除的作文提交紀錄。", 404, false);
    }
    assertDatabaseResult(result.error, "無法刪除作文與版本紀錄。");
    if (result.data !== true) {
      throw new ApiError("DATABASE_ERROR", "作文刪除結果不完整。", 500, true);
    }
  }

  private async loadVersionFeedback(
    learnerId: string,
    versionId: string,
  ): Promise<LoadedFeedback | undefined> {
    const versionResult = await this.client
      .from("writing_versions")
      .select("ai_feedback_id")
      .eq("id", versionId)
      .eq("user_id", learnerId)
      .maybeSingle();
    assertDatabaseResult(versionResult.error, "無法讀取前一版作文回饋。");
    return versionResult.data?.ai_feedback_id
      ? this.loadFeedback(learnerId, versionResult.data.ai_feedback_id)
      : undefined;
  }

  private async loadFeedback(
    learnerId: string,
    feedbackId: string,
  ): Promise<LoadedFeedback | undefined> {
    const result = await this.client
      .from("ai_feedback")
      .select("id, feedback_json, model")
      .eq("id", feedbackId)
      .eq("user_id", learnerId)
      .eq("feature", "evaluate_writing")
      .maybeSingle();
    assertDatabaseResult(result.error, "無法讀取作文 AI 回饋。");
    return result.data
      ? {
          feedbackId: result.data.id,
          feedback: writingFeedbackSchema.parse(result.data.feedback_json),
          model: result.data.model,
        }
      : undefined;
  }
}

function mapWorkspacePrompt(row: WritingPromptRow) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    level: row.level,
    writingType: row.writing_type,
    titleZhTw: row.title_zh_tw,
    promptDe: row.prompt_de,
    promptZhTw: row.prompt_zh_tw,
    requirementsZhTw: readStringArray(row.requirements_json),
    minimumWords: row.minimum_words,
    maximumWords: row.maximum_words,
    estimatedMinutes: row.estimated_minutes,
    skillIds: row.skill_ids,
    version: row.version,
  };
}

function mapWorkspaceSubmission(
  row: WritingSubmissionRow,
  versions: WritingVersionRow[],
  feedbackByVersion: Map<string, WorkspaceFeedbackRow>,
) {
  return {
    id: row.id,
    userId: row.user_id,
    lessonId: row.lesson_id,
    promptId: row.prompt_id,
    level: row.level,
    writingType: row.writing_type,
    status: row.status,
    ...(row.current_version_id ? { currentVersionId: row.current_version_id } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versions: [...versions]
      .sort((left, right) => left.version_number - right.version_number)
      .map((version) => {
        const feedback = feedbackByVersion.get(version.id);
        return {
          id: version.id,
          submissionId: version.submission_id,
          ...(version.previous_version_id
            ? { previousVersionId: version.previous_version_id }
            : {}),
          versionNumber: version.version_number,
          textDe: version.text_de,
          wordCount: version.word_count,
          diff: writingDiffChangeSchema.array().parse(version.diff_json),
          idempotencyKey: version.idempotency_key,
          ...(version.ai_feedback_id ? { feedbackId: version.ai_feedback_id } : {}),
          ...(feedback ? { feedback: writingFeedbackSchema.parse(feedback.feedback_json) } : {}),
          createdAt: version.created_at,
        };
      }),
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    grouped.set(value, [...(grouped.get(value) ?? []), row]);
  }
  return grouped;
}

function assertDatabaseResult(
  error: { code?: string; message: string } | null,
  message: string,
): void {
  if (!error) {
    return;
  }
  if (error.code === "40001" || error.message.includes("writing version conflict")) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "作文已在其他裝置產生新版本，請重新整理後再修改。",
      409,
      true,
    );
  }
  throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
}

function assertFirstDatabaseError(
  errors: Array<{ code?: string; message: string } | null>,
  message: string,
): void {
  const error = errors.find(Boolean);
  if (error) {
    throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
  }
}

function isCefrLevel(value: string): value is CefrLevel {
  return (SUPPORTED_LEVELS as readonly string[]).includes(value);
}

function isWritingType(value: string): value is WritingType {
  return (WRITING_TYPES as readonly string[]).includes(value);
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
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

function readInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

function readBoolean(record: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}
