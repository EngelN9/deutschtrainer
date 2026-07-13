import type { GradingResult } from "@deutschtrainer/grading";
import type {
  Attempt,
  ErrorRecord,
  LearningRecordSnapshot,
  LessonProgressRecord,
  ReviewItem,
  SkillMastery,
} from "@deutschtrainer/shared-types";
import { databaseUuidSchema, learningRecordSnapshotSchema } from "@deutschtrainer/validation";
import { z } from "zod";
import type { Database, Json } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";

const submitAttemptResultSchema = z.object({
  attemptId: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  completionPercent: z.number().min(0).max(100).optional(),
  scheduledReviewCount: z.number().int().nonnegative().optional(),
  idempotentReplay: z.boolean(),
});

type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];
type ErrorRecordRow = Database["public"]["Tables"]["error_records"]["Row"];
type SkillMasteryRow = Database["public"]["Tables"]["skill_mastery"]["Row"];
type ReviewQueueRow = Database["public"]["Tables"]["review_queue"]["Row"];
type LessonProgressRow = Database["public"]["Tables"]["lesson_progress"]["Row"];

export interface SubmitRemoteAttemptInput {
  exerciseId: string;
  answer: unknown;
  gradingResult: GradingResult;
  durationMs: number;
  usedHint: boolean;
  mode: Attempt["mode"];
  idempotencyKey: string;
  reviewId?: string;
}

export async function submitRemoteAttempt(input: SubmitRemoteAttemptInput) {
  const { data, error } = await supabase.rpc("record_fixed_attempt", {
    p_exercise_id: input.exerciseId,
    p_answer_json: toJson(input.answer),
    p_normalized_answer_json: toJson(input.gradingResult.normalizedAnswer),
    p_grading_result_json: toJson(input.gradingResult),
    p_score: input.gradingResult.score,
    p_is_correct: input.gradingResult.isCorrect,
    p_duration_ms: input.durationMs,
    p_used_hint: input.usedHint,
    p_mode: input.mode,
    p_idempotency_key: input.idempotencyKey,
    p_review_id: input.reviewId ?? null,
  });

  if (error) {
    throw new Error(`學習紀錄儲存失敗：${error.message}`);
  }

  return submitAttemptResultSchema.parse(data);
}

export async function getRemoteLearningRecords(): Promise<LearningRecordSnapshot> {
  const attemptsPromise = supabase
    .from("attempts")
    .select("*")
    .order("submitted_at", { ascending: false });
  const errorsPromise = supabase
    .from("error_records")
    .select("*")
    .order("created_at", { ascending: false });
  const masteryPromise = supabase
    .from("skill_mastery")
    .select("*")
    .order("mastery_score", { ascending: true });
  const reviewsPromise = supabase
    .from("review_queue")
    .select("*")
    .order("scheduled_at", { ascending: true });
  const lessonProgressPromise = supabase
    .from("lesson_progress")
    .select("*")
    .order("last_practiced_at", { ascending: false });
  const skillsPromise = supabase.from("skills").select("id, code, name_zh_tw");
  const [
    attemptsResult,
    errorsResult,
    masteryResult,
    reviewsResult,
    lessonProgressResult,
    skillsResult,
  ] = await Promise.all([
    attemptsPromise,
    errorsPromise,
    masteryPromise,
    reviewsPromise,
    lessonProgressPromise,
    skillsPromise,
  ]);

  const firstError = [
    attemptsResult.error,
    errorsResult.error,
    masteryResult.error,
    reviewsResult.error,
    lessonProgressResult.error,
    skillsResult.error,
  ].find(Boolean);
  if (firstError) {
    throw new Error(`學習紀錄載入失敗：${firstError.message}`);
  }

  const snapshot = {
    attempts: (attemptsResult.data ?? []).map(mapAttempt),
    errors: (errorsResult.data ?? []).map(mapErrorRecord),
    mastery: (masteryResult.data ?? []).map(mapSkillMastery),
    reviews: (reviewsResult.data ?? []).map(mapReviewItem),
    lessonProgress: (lessonProgressResult.data ?? []).map(mapLessonProgress),
    skillNames: Object.fromEntries(
      (skillsResult.data ?? []).map((skill) => [skill.id, skill.name_zh_tw || skill.code]),
    ),
  };

  return learningRecordSnapshotSchema.parse(snapshot) as LearningRecordSnapshot;
}

function mapAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    lessonId: row.lesson_id,
    submittedAt: row.submitted_at,
    score: Number(row.score),
    isCorrect: row.is_correct,
    durationMs: row.duration_ms,
    usedHint: row.used_hint,
    mode: row.mode,
    idempotencyKey: row.idempotency_key,
  };
}

function mapErrorRecord(row: ErrorRecordRow): ErrorRecord {
  return {
    id: row.id,
    userId: row.user_id,
    attemptId: row.attempt_id,
    exerciseId: row.exercise_id,
    lessonId: row.lesson_id,
    skillId: row.skill_id,
    type: row.type,
    severity: row.severity,
    original: row.original,
    correction: row.correction,
    explanationZhTw: row.explanation_zh_tw,
    createdAt: row.created_at,
  };
}

function mapSkillMastery(row: SkillMasteryRow): SkillMastery {
  return {
    userId: row.user_id,
    skillId: row.skill_id,
    masteryScore: Number(row.mastery_score),
    confidenceScore: Number(row.confidence_score),
    attemptCount: row.attempt_count,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    hintCount: row.hint_count,
    averageResponseTimeMs: Number(row.average_response_time_ms),
    ...(row.last_practiced_at ? { lastPracticedAt: row.last_practiced_at } : {}),
    ...(row.next_review_at ? { nextReviewAt: row.next_review_at } : {}),
    correctStreak: row.correct_streak,
    incorrectStreak: row.incorrect_streak,
    lastErrorTypes: row.last_error_types,
  };
}

function mapReviewItem(row: ReviewQueueRow): ReviewItem {
  return {
    id: row.id,
    userId: row.user_id,
    skillId: row.skill_id,
    exerciseId: row.exercise_id,
    priority: row.priority,
    scheduledAt: row.scheduled_at,
    reason: row.reason,
    intervalDays: row.interval_days,
    easeFactor: Number(row.ease_factor),
    status: row.status,
    sourceAttemptId: row.source_attempt_id,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

function mapLessonProgress(row: LessonProgressRow): LessonProgressRecord {
  return {
    userId: row.user_id,
    lessonId: row.lesson_id,
    status: row.status,
    completionPercent: Number(row.completion_percent),
    completedExerciseIds: row.completed_exercise_ids,
    correctExerciseCount: row.correct_exercise_count,
    attemptedExerciseCount: row.attempted_exercise_count,
    ...(row.last_practiced_at ? { lastPracticedAt: row.last_practiced_at } : {}),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
