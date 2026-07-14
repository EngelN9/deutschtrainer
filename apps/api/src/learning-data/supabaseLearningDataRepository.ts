import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AI_EVALUATED_EXERCISE_TYPES,
  FIXED_EXERCISE_TYPES,
  type AiEvaluatedExercise,
  type CatalogCourse,
  type CefrLevel,
  type FixedExercise,
  type LearningRecordSnapshot,
  type LessonContent,
  type LessonExercise,
  type ReviewItem,
} from "@deutschtrainer/shared-types";
import {
  aiEvaluatedExerciseSchema,
  courseListResponseSchema,
  databaseUuidSchema,
  fixedExerciseSchema,
  fixedGradingResultSchema,
  gradingPolicySchema,
  learningRecordSnapshotSchema,
  reviewQueueResponseSchema,
  type CourseListResponse,
  type ReviewQueueRequest,
  type ReviewQueueResponse,
} from "@deutschtrainer/validation";
import { z } from "zod";
import { ApiError } from "../errors";
import type {
  AuthenticatedLearningUser,
  LearningDataRepository,
  RecordedFixedAttempt,
  RecordFixedAttemptInput,
  StoredFixedAttempt,
  StoredReview,
} from "./types";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface CourseRow {
  id: string;
  level: CefrLevel;
  title_zh_tw: string;
  title_de: string;
  description_zh_tw: string;
  status: "published";
  version: number;
}

interface UnitRow {
  id: string;
  course_id: string;
  title_zh_tw: string;
  order_index: number;
  status: "published";
  version: number;
}

interface LessonRow {
  id: string;
  unit_id: string;
  level: CefrLevel;
  title_zh_tw: string;
  estimated_minutes: number;
  skill_categories: LessonContent["skillCategories"];
  prerequisite_skill_ids: string[];
  learning_objectives: string[];
  vocabulary_tags: string[];
  grammar_tags: string[];
  cefr_descriptor: string;
  status: "published";
  version: number;
  order_index: number;
}

interface ActivityRow {
  id: string;
  lesson_id: string;
  title_zh_tw: string;
  type: "instruction" | "practice" | "review" | "quiz" | "task";
  order_index: number;
}

interface ExerciseRow {
  id: string;
  activity_id: string;
  level: CefrLevel;
  type: string;
  title: string;
  instruction_zh_tw: string;
  prompt_de: string;
  payload_json: Json;
  skill_ids: string[];
  grammar_topic_ids: string[];
  vocabulary_ids: string[];
  estimated_seconds: number;
  difficulty: number;
  source_type: "human" | "ai_generated" | "ai_assisted";
  review_status: "approved";
  version: number;
  order_index: number;
}

interface ExerciseOptionRow {
  id: string;
  exercise_id: string;
  label: string;
  text_de: string;
  text_zh_tw: string | null;
  order_index: number;
}

interface ExerciseAnswerRow {
  exercise_id: string;
  answer_json: Json;
  grading_policy_json: Json;
  explanation_zh_tw: string;
}

interface AttemptRow {
  id: string;
  user_id: string;
  exercise_id: string;
  lesson_id: string;
  submitted_at: string;
  score: number | string;
  is_correct: boolean;
  duration_ms: number;
  used_hint: boolean;
  mode: "lesson" | "review" | "practice" | "placement";
  idempotency_key: string;
}

interface ErrorRecordRow {
  id: string;
  user_id: string;
  attempt_id: string;
  exercise_id: string;
  lesson_id: string;
  skill_id: string;
  type: LearningRecordSnapshot["errors"][number]["type"];
  severity: LearningRecordSnapshot["errors"][number]["severity"];
  original: string;
  correction: string;
  explanation_zh_tw: string;
  created_at: string;
}

interface SkillMasteryRow {
  user_id: string;
  skill_id: string;
  mastery_score: number | string;
  confidence_score: number | string;
  attempt_count: number;
  correct_count: number;
  incorrect_count: number;
  hint_count: number;
  average_response_time_ms: number | string;
  last_practiced_at: string | null;
  next_review_at: string | null;
  correct_streak: number;
  incorrect_streak: number;
  last_error_types: LearningRecordSnapshot["mastery"][number]["lastErrorTypes"];
}

interface ReviewQueueRow {
  id: string;
  user_id: string;
  skill_id: string;
  exercise_id: string;
  priority: number;
  scheduled_at: string;
  reason: string;
  interval_days: number;
  ease_factor: number | string;
  status: ReviewItem["status"];
  source_attempt_id: string;
  completed_at: string | null;
  completed_attempt_id: string | null;
}

interface LessonProgressRow {
  user_id: string;
  lesson_id: string;
  status: LearningRecordSnapshot["lessonProgress"][number]["status"];
  completion_percent: number | string;
  completed_exercise_ids: string[];
  correct_exercise_count: number;
  attempted_exercise_count: number;
  last_practiced_at: string | null;
  completed_at: string | null;
}

const recordAttemptResultSchema = z.object({
  attemptId: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  completionPercent: z.number().min(0).max(100).optional(),
  scheduledReviewCount: z.number().int().nonnegative().optional(),
  idempotentReplay: z.boolean(),
});

export class SupabaseLearningDataRepository implements LearningDataRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedLearningUser | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      return undefined;
    }
    const profileResult = await this.client
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userResult.data.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(profileResult.error, "無法驗證學習者資料。");
    if (!profileResult.data) {
      return undefined;
    }
    return { authUserId: userResult.data.user.id, profileId: profileResult.data.id };
  }

  async listPublishedCatalog(level?: CefrLevel): Promise<CourseListResponse> {
    const [coursesResult, unitsResult, lessonsResult, activitiesResult, exercisesResult] =
      await Promise.all([
        this.client
          .from("courses")
          .select("id, level, title_zh_tw, title_de, description_zh_tw, status, version")
          .eq("status", "published")
          .is("deleted_at", null)
          .order("level"),
        this.client
          .from("units")
          .select("id, course_id, title_zh_tw, order_index, status, version")
          .eq("status", "published")
          .is("deleted_at", null)
          .order("order_index"),
        this.client
          .from("lessons")
          .select(
            "id, unit_id, level, title_zh_tw, estimated_minutes, skill_categories, prerequisite_skill_ids, learning_objectives, vocabulary_tags, grammar_tags, cefr_descriptor, status, version, order_index",
          )
          .eq("status", "published")
          .is("deleted_at", null)
          .order("order_index"),
        this.client
          .from("activities")
          .select("id, lesson_id, title_zh_tw, type, order_index")
          .eq("status", "published")
          .is("deleted_at", null)
          .order("order_index"),
        this.client
          .from("exercises")
          .select(
            "id, activity_id, level, type, title, instruction_zh_tw, prompt_de, payload_json, skill_ids, grammar_topic_ids, vocabulary_ids, estimated_seconds, difficulty, source_type, review_status, version, order_index",
          )
          .eq("status", "published")
          .eq("review_status", "approved")
          .is("deleted_at", null)
          .order("order_index"),
      ]);
    assertFirstDatabaseError(
      [
        coursesResult.error,
        unitsResult.error,
        lessonsResult.error,
        activitiesResult.error,
        exercisesResult.error,
      ],
      "無法載入已發布課程。",
    );

    const exercises = (exercisesResult.data ?? []) as ExerciseRow[];
    const exerciseIds = exercises.map((row) => row.id);
    const [optionsResult, answersResult] = exerciseIds.length
      ? await Promise.all([
          this.client
            .from("exercise_options")
            .select("id, exercise_id, label, text_de, text_zh_tw, order_index")
            .in("exercise_id", exerciseIds)
            .order("order_index"),
          this.client
            .from("exercise_answers")
            .select("exercise_id, answer_json, grading_policy_json, explanation_zh_tw")
            .in("exercise_id", exerciseIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    assertFirstDatabaseError([optionsResult.error, answersResult.error], "無法載入課程題目答案。");

    const catalog = mapCatalog(
      (coursesResult.data ?? []) as CourseRow[],
      (unitsResult.data ?? []) as UnitRow[],
      (lessonsResult.data ?? []) as LessonRow[],
      (activitiesResult.data ?? []) as ActivityRow[],
      exercises,
      (optionsResult.data ?? []) as ExerciseOptionRow[],
      (answersResult.data ?? []) as ExerciseAnswerRow[],
      level,
    );
    return courseListResponseSchema.parse(catalog);
  }

  async getPublishedCourse(courseId: string): Promise<CatalogCourse | undefined> {
    const catalog = await this.listPublishedCatalog();
    return catalog.courses.find((course) => course.id === courseId) as CatalogCourse | undefined;
  }

  async getPublishedLesson(lessonId: string): Promise<LessonContent | undefined> {
    const catalog = await this.listPublishedCatalog();
    return catalog.courses
      .flatMap((course) => course.units)
      .flatMap((unit) => unit.lessons)
      .find((lesson) => lesson.id === lessonId) as LessonContent | undefined;
  }

  async getFixedExercise(exerciseId: string): Promise<FixedExercise | undefined> {
    const exerciseResult = await this.client
      .from("exercises")
      .select(
        "id, activity_id, level, type, title, instruction_zh_tw, prompt_de, payload_json, skill_ids, grammar_topic_ids, vocabulary_ids, estimated_seconds, difficulty, source_type, review_status, version, order_index",
      )
      .eq("id", exerciseId)
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(exerciseResult.error, "無法讀取固定題目。");
    if (
      !exerciseResult.data ||
      !(FIXED_EXERCISE_TYPES as readonly string[]).includes(exerciseResult.data.type)
    ) {
      return undefined;
    }
    const [optionsResult, answerResult] = await Promise.all([
      this.client
        .from("exercise_options")
        .select("id, exercise_id, label, text_de, text_zh_tw, order_index")
        .eq("exercise_id", exerciseId)
        .order("order_index"),
      this.client
        .from("exercise_answers")
        .select("exercise_id, answer_json, grading_policy_json, explanation_zh_tw")
        .eq("exercise_id", exerciseId)
        .maybeSingle(),
    ]);
    assertFirstDatabaseError([optionsResult.error, answerResult.error], "無法讀取固定題目答案。");
    if (!answerResult.data) {
      return undefined;
    }
    return mapLessonExercise(
      exerciseResult.data as ExerciseRow,
      (optionsResult.data ?? []) as ExerciseOptionRow[],
      answerResult.data as ExerciseAnswerRow,
    ).exercise as FixedExercise;
  }

  async findAttemptByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredFixedAttempt | undefined> {
    const attemptResult = await this.client
      .from("attempts")
      .select("id, exercise_id, lesson_id, mode")
      .eq("user_id", learnerId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertDatabaseResult(attemptResult.error, "無法檢查重複作答。");
    if (!attemptResult.data) {
      return undefined;
    }
    const [answerResult, progressResult] = await Promise.all([
      this.client
        .from("attempt_answers")
        .select("grading_result_json")
        .eq("attempt_id", attemptResult.data.id)
        .single(),
      this.client
        .from("lesson_progress")
        .select("completion_percent")
        .eq("user_id", learnerId)
        .eq("lesson_id", attemptResult.data.lesson_id)
        .maybeSingle(),
    ]);
    assertFirstDatabaseError([answerResult.error, progressResult.error], "無法讀取既有作答結果。");
    if (!answerResult.data) {
      throw new ApiError("DATABASE_ERROR", "既有作答缺少評分結果。", 500, true);
    }
    const gradingResult = fixedGradingResultSchema.safeParse(answerResult.data.grading_result_json);
    if (!gradingResult.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "這個 idempotency key 已用於其他評分流程。",
        409,
        false,
      );
    }
    return {
      attemptId: attemptResult.data.id,
      exerciseId: attemptResult.data.exercise_id,
      lessonId: attemptResult.data.lesson_id,
      mode: attemptResult.data.mode,
      gradingResult: gradingResult.data,
      completionPercent: Number(progressResult.data?.completion_percent ?? 0),
    };
  }

  async recordFixedAttempt(input: RecordFixedAttemptInput): Promise<RecordedFixedAttempt> {
    const result = await this.client.rpc("record_fixed_attempt_service", {
      p_user_id: input.learnerId,
      p_exercise_id: input.request.exerciseId,
      p_answer_json: toJson(input.request.answer),
      p_normalized_answer_json: toJson(input.gradingResult.normalizedAnswer),
      p_grading_result_json: toJson(input.gradingResult),
      p_score: input.gradingResult.score,
      p_is_correct: input.gradingResult.isCorrect,
      p_duration_ms: input.request.durationMs,
      p_used_hint: input.request.usedHint,
      p_mode: input.reviewId ? "review" : input.request.mode,
      p_idempotency_key: input.request.idempotencyKey,
      p_review_id: input.reviewId ?? null,
    });
    assertDatabaseResult(result.error, "無法保存固定題作答與學習進度。");
    const parsed = recordAttemptResultSchema.parse(result.data);
    const progressResult = await this.client
      .from("lesson_progress")
      .select("completion_percent")
      .eq("user_id", input.learnerId)
      .eq("lesson_id", parsed.lessonId)
      .maybeSingle();
    assertDatabaseResult(progressResult.error, "無法讀取更新後的課堂進度。");
    return {
      attemptId: parsed.attemptId,
      lessonId: parsed.lessonId,
      completionPercent: Number(
        parsed.completionPercent ?? progressResult.data?.completion_percent ?? 0,
      ),
      scheduledReviewCount: parsed.scheduledReviewCount ?? 0,
      idempotentReplay: parsed.idempotentReplay,
    };
  }

  async getLearningRecords(learnerId: string): Promise<LearningRecordSnapshot> {
    const [attempts, errors, mastery, reviews, lessonProgress, skills] = await Promise.all([
      this.client
        .from("attempts")
        .select("*")
        .eq("user_id", learnerId)
        .order("submitted_at", { ascending: false })
        .limit(200),
      this.client
        .from("error_records")
        .select("*")
        .eq("user_id", learnerId)
        .order("created_at", { ascending: false })
        .limit(200),
      this.client.from("skill_mastery").select("*").eq("user_id", learnerId).order("mastery_score"),
      this.client
        .from("review_queue")
        .select("*")
        .eq("user_id", learnerId)
        .order("scheduled_at")
        .limit(200),
      this.client
        .from("lesson_progress")
        .select("*")
        .eq("user_id", learnerId)
        .order("last_practiced_at", { ascending: false }),
      this.client.from("skills").select("id, code, name_zh_tw"),
    ]);
    assertFirstDatabaseError(
      [
        attempts.error,
        errors.error,
        mastery.error,
        reviews.error,
        lessonProgress.error,
        skills.error,
      ],
      "無法載入學習進度。",
    );
    const snapshot = {
      attempts: ((attempts.data ?? []) as AttemptRow[]).map(mapAttempt),
      errors: ((errors.data ?? []) as ErrorRecordRow[]).map(mapErrorRecord),
      mastery: ((mastery.data ?? []) as SkillMasteryRow[]).map(mapSkillMastery),
      reviews: ((reviews.data ?? []) as ReviewQueueRow[]).map(mapReviewItem),
      lessonProgress: ((lessonProgress.data ?? []) as LessonProgressRow[]).map(mapLessonProgress),
      skillNames: Object.fromEntries(
        (skills.data ?? []).map((skill) => [skill.id, skill.name_zh_tw || skill.code]),
      ),
    };
    return learningRecordSnapshotSchema.parse(snapshot) as LearningRecordSnapshot;
  }

  async getReviews(learnerId: string, request: ReviewQueueRequest): Promise<ReviewQueueResponse> {
    let query = this.client
      .from("review_queue")
      .select("*")
      .eq("user_id", learnerId)
      .order("scheduled_at")
      .order("priority", { ascending: false })
      .limit(request.limit);
    if (request.status) {
      query = query.eq("status", request.status);
    }
    if (request.dueBefore) {
      query = query.lte("scheduled_at", request.dueBefore);
    }
    const [reviewsResult, skillsResult] = await Promise.all([
      query,
      this.client.from("skills").select("id, code, name_zh_tw"),
    ]);
    assertFirstDatabaseError([reviewsResult.error, skillsResult.error], "無法載入複習佇列。");
    return reviewQueueResponseSchema.parse({
      reviews: ((reviewsResult.data ?? []) as ReviewQueueRow[]).map(mapReviewItem),
      skillNames: Object.fromEntries(
        (skillsResult.data ?? []).map((skill) => [skill.id, skill.name_zh_tw || skill.code]),
      ),
    });
  }

  async getReview(learnerId: string, reviewId: string): Promise<StoredReview | undefined> {
    const result = await this.client
      .from("review_queue")
      .select("*")
      .eq("id", reviewId)
      .eq("user_id", learnerId)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法讀取複習項目。");
    return result.data ? mapStoredReview(result.data as ReviewQueueRow) : undefined;
  }

  async getNextScheduledReviewAt(
    learnerId: string,
    skillId: string,
    exerciseId: string,
  ): Promise<string | undefined> {
    const result = await this.client
      .from("review_queue")
      .select("scheduled_at")
      .eq("user_id", learnerId)
      .eq("skill_id", skillId)
      .eq("exercise_id", exerciseId)
      .eq("status", "scheduled")
      .order("scheduled_at")
      .limit(1)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法讀取下一次複習時間。");
    return result.data?.scheduled_at;
  }
}

function mapCatalog(
  courses: CourseRow[],
  units: UnitRow[],
  lessons: LessonRow[],
  activities: ActivityRow[],
  exercises: ExerciseRow[],
  options: ExerciseOptionRow[],
  answers: ExerciseAnswerRow[],
  level?: CefrLevel,
): CourseListResponse {
  const optionsByExercise = groupBy(options, (row) => row.exercise_id);
  const answersByExercise = new Map(answers.map((answer) => [answer.exercise_id, answer]));
  const exercisesByActivity = groupBy(
    exercises.map((row) =>
      mapLessonExercise(row, optionsByExercise.get(row.id) ?? [], answersByExercise.get(row.id)),
    ),
    (entry) => entry.activityId,
  );
  const activitiesByLesson = groupBy(activities, (row) => row.lesson_id);
  const lessonsByUnit = groupBy(lessons, (row) => row.unit_id);
  const unitsByCourse = groupBy(units, (row) => row.course_id);

  return {
    source: "api",
    courses: courses
      .filter((course) => !level || course.level === level)
      .map((course) => ({
        id: course.id,
        level: course.level,
        titleZhTw: course.title_zh_tw,
        titleDe: course.title_de,
        descriptionZhTw: course.description_zh_tw,
        status: course.status,
        version: course.version,
        units: [...(unitsByCourse.get(course.id) ?? [])]
          .sort((left, right) => left.order_index - right.order_index)
          .map((unit) => ({
            id: unit.id,
            courseId: unit.course_id,
            titleZhTw: unit.title_zh_tw,
            orderIndex: unit.order_index,
            status: unit.status,
            version: unit.version,
            lessons: [...(lessonsByUnit.get(unit.id) ?? [])]
              .sort((left, right) => left.order_index - right.order_index)
              .map((lesson) => ({
                id: lesson.id,
                unitId: lesson.unit_id,
                level: lesson.level,
                titleZhTw: lesson.title_zh_tw,
                estimatedMinutes: lesson.estimated_minutes,
                skillCategories: lesson.skill_categories,
                prerequisiteSkillIds: lesson.prerequisite_skill_ids,
                learningObjectives: lesson.learning_objectives,
                vocabularyTags: lesson.vocabulary_tags,
                grammarTags: lesson.grammar_tags,
                cefrDescriptor: lesson.cefr_descriptor,
                status: lesson.status,
                version: lesson.version,
                activities: [...(activitiesByLesson.get(lesson.id) ?? [])]
                  .sort((left, right) => left.order_index - right.order_index)
                  .map((activity) => ({
                    id: activity.id,
                    lessonId: activity.lesson_id,
                    titleZhTw: activity.title_zh_tw,
                    type: activity.type,
                    orderIndex: activity.order_index,
                    exercises: [...(exercisesByActivity.get(activity.id) ?? [])]
                      .sort((left, right) => left.orderIndex - right.orderIndex)
                      .map((entry) => entry.exercise),
                  })),
              })),
          })),
      })),
  };
}

function mapLessonExercise(
  row: ExerciseRow,
  optionRows: ExerciseOptionRow[],
  answerRow?: ExerciseAnswerRow,
): { activityId: string; exercise: LessonExercise; orderIndex: number } {
  const payload = asObject(row.payload_json);
  const options = [...optionRows]
    .sort((left, right) => left.order_index - right.order_index)
    .map((option) => ({
      id: option.id,
      label: option.label,
      textDe: option.text_de,
      ...(option.text_zh_tw ? { textZhTw: option.text_zh_tw } : {}),
      orderIndex: option.order_index,
    }));
  const base = {
    id: row.id,
    level: row.level,
    type: row.type,
    title: row.title,
    instructionZhTw: row.instruction_zh_tw,
    promptDe: row.prompt_de,
    skillIds: row.skill_ids,
    grammarTopicIds: row.grammar_topic_ids,
    vocabularyIds: row.vocabulary_ids,
    estimatedSeconds: row.estimated_seconds,
    difficulty: row.difficulty,
    sourceType: row.source_type,
    reviewStatus: row.review_status,
    version: row.version,
  };

  if ((AI_EVALUATED_EXERCISE_TYPES as readonly string[]).includes(row.type)) {
    const promptZhTw = readString(payload.promptZhTw);
    const candidate = {
      ...base,
      ...(promptZhTw ? { promptZhTw } : {}),
      responsePlaceholderZhTw: readString(payload.responsePlaceholderZhTw) || "請輸入你的德語回答",
      minimumCharacters: readInteger(payload.minimumCharacters, 10),
      maximumCharacters: readInteger(payload.maximumCharacters, 800),
    };
    return {
      activityId: row.activity_id,
      exercise: aiEvaluatedExerciseSchema.parse(candidate) as AiEvaluatedExercise,
      orderIndex: row.order_index,
    };
  }

  if (!(FIXED_EXERCISE_TYPES as readonly string[]).includes(row.type) || !answerRow) {
    throw new ApiError("DATABASE_ERROR", `題目 ${row.id} 的固定答案不完整。`, 500, false);
  }
  const answer = asObject(answerRow.answer_json);
  const policy = gradingPolicySchema.parse(answerRow.grading_policy_json);
  let candidate: unknown;
  switch (row.type) {
    case "multiple_choice":
      candidate = { ...base, options, answer: { optionId: answer.optionId } };
      break;
    case "multiple_select":
      candidate = {
        ...base,
        options,
        answer: { optionIds: answer.optionIds },
        requireAllCorrect: payload.requireAllCorrect,
        gradingPolicy: policy,
      };
      break;
    case "fill_blank":
      candidate = {
        ...base,
        answer: { acceptedAnswers: answer.acceptedAnswers },
        gradingPolicy: policy,
      };
      break;
    case "sentence_order":
      candidate = {
        ...base,
        segments: payload.segments,
        answer: { segmentIds: answer.segmentIds },
        allowPartialCredit: payload.allowPartialCredit,
      };
      break;
    case "matching":
      candidate = {
        ...base,
        leftItems: payload.leftItems,
        rightItems: payload.rightItems,
        answer: { pairs: answer.pairs },
        allowPartialCredit: payload.allowPartialCredit,
      };
      break;
    case "error_correction":
      candidate = {
        ...base,
        answer: { acceptedAnswers: answer.acceptedAnswers },
        gradingPolicy: policy,
        explanationZhTw: answerRow.explanation_zh_tw,
      };
      break;
  }
  return {
    activityId: row.activity_id,
    exercise: fixedExerciseSchema.parse(candidate) as FixedExercise,
    orderIndex: row.order_index,
  };
}

function mapAttempt(row: AttemptRow): LearningRecordSnapshot["attempts"][number] {
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

function mapErrorRecord(row: ErrorRecordRow): LearningRecordSnapshot["errors"][number] {
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

function mapSkillMastery(row: SkillMasteryRow): LearningRecordSnapshot["mastery"][number] {
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

function mapStoredReview(row: ReviewQueueRow): StoredReview {
  return {
    ...mapReviewItem(row),
    ...(row.completed_attempt_id ? { completedAttemptId: row.completed_attempt_id } : {}),
  };
}

function mapLessonProgress(
  row: LessonProgressRow,
): LearningRecordSnapshot["lessonProgress"][number] {
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

function readString(value: Json | undefined): string {
  return typeof value === "string" ? value : "";
}

function readInteger(value: Json | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function asObject(value: Json): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function assertDatabaseResult(
  error: { message: string } | null,
  message: string,
): asserts error is null {
  if (error) {
    throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
  }
}

function assertFirstDatabaseError(
  errors: Array<{ message: string } | null>,
  message: string,
): void {
  const error = errors.find(Boolean);
  if (error) {
    throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
  }
}
