import {
  apiErrorResponseSchema,
  evaluateWritingResponseSchema,
  writingWorkspaceSchema,
  type EvaluateWritingRequest,
  type EvaluateWritingResponse,
  type WritingWorkspace,
} from "@deutschtrainer/validation";
import type { Database } from "../../lib/database.types";
import { mobileEnv } from "../../lib/env";
import { supabase } from "../../lib/supabase";

type WritingPromptRow = Database["public"]["Tables"]["writing_prompts"]["Row"];
type WritingSubmissionRow = Database["public"]["Tables"]["writing_submissions"]["Row"];
type WritingVersionRow = Database["public"]["Tables"]["writing_versions"]["Row"];
type AiFeedbackRow = Database["public"]["Tables"]["ai_feedback"]["Row"];

export async function getWritingWorkspace(): Promise<WritingWorkspace> {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error || !sessionResult.data.session) {
    throw new Error("登入狀態已失效，請重新登入。");
  }

  const [promptsResult, submissionsResult, versionsResult, feedbackResult] = await Promise.all([
    supabase
      .from("writing_prompts")
      .select("*")
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null)
      .order("level"),
    supabase.from("writing_submissions").select("*").order("updated_at", { ascending: false }),
    supabase.from("writing_versions").select("*").order("version_number"),
    supabase.from("ai_feedback").select("*").eq("feature", "evaluate_writing"),
  ]);
  const firstError = [
    promptsResult.error,
    submissionsResult.error,
    versionsResult.error,
    feedbackResult.error,
  ].find(Boolean);
  if (firstError) {
    throw new Error(`無法載入作文資料：${firstError.message}`);
  }

  const feedbackByVersion = new Map(
    (feedbackResult.data ?? []).map((row) => [row.target_id, row] as const),
  );
  const versionsBySubmission = groupBy(versionsResult.data ?? [], (row) => row.submission_id);
  const candidate = {
    prompts: (promptsResult.data ?? []).map(mapPrompt),
    submissions: (submissionsResult.data ?? []).map((submission) =>
      mapSubmission(submission, versionsBySubmission.get(submission.id) ?? [], feedbackByVersion),
    ),
  };
  const parsed = writingWorkspaceSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("作文資料格式不完整，請稍後重新整理。");
  }
  return parsed.data;
}

export async function submitWriting(
  request: EvaluateWritingRequest,
): Promise<EvaluateWritingResponse> {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error || !sessionResult.data.session?.access_token) {
    throw new Error("登入狀態已失效，請重新登入。");
  }

  let response: Response;
  try {
    response = await fetch(`${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/ai/evaluate-writing`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${sessionResult.data.session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("無法連線至作文批改服務，請檢查網路後重試。");
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const errorResult = apiErrorResponseSchema.safeParse(payload);
    throw new Error(
      errorResult.success ? errorResult.data.error.message : "作文批改服務暫時無法使用。",
    );
  }
  const parsed = evaluateWritingResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("作文批改回傳格式不完整，請稍後重試。");
  }
  return parsed.data;
}

export async function deleteWritingSubmission(submissionId: string): Promise<void> {
  const result = await supabase.rpc("delete_own_writing_submission", {
    p_submission_id: submissionId,
  });
  if (result.error || result.data !== true) {
    throw new Error(result.error?.message ?? "無法刪除作文與版本紀錄。");
  }
}

function mapPrompt(row: WritingPromptRow) {
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

function mapSubmission(
  row: WritingSubmissionRow,
  versionRows: WritingVersionRow[],
  feedbackByVersion: Map<string, AiFeedbackRow>,
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
    versions: versionRows
      .toSorted((left, right) => left.version_number - right.version_number)
      .map((version) => mapVersion(version, feedbackByVersion.get(version.id))),
  };
}

function mapVersion(row: WritingVersionRow, feedback?: AiFeedbackRow) {
  return {
    id: row.id,
    submissionId: row.submission_id,
    ...(row.previous_version_id ? { previousVersionId: row.previous_version_id } : {}),
    versionNumber: row.version_number,
    textDe: row.text_de,
    wordCount: row.word_count,
    diff: row.diff_json,
    idempotencyKey: row.idempotency_key,
    ...(row.ai_feedback_id ? { feedbackId: row.ai_feedback_id } : {}),
    ...(feedback ? { feedback: feedback.feedback_json } : {}),
    createdAt: row.created_at,
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

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}
