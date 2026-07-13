import type { CourseCatalog, FixedExercise, LessonContent } from "@deutschtrainer/shared-types";
import {
  courseCatalogSchema,
  fixedExerciseSchema,
  gradingPolicySchema,
} from "@deutschtrainer/validation";
import type { Database, Json } from "../../lib/database.types";
import { mobileEnv } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { mockCourseCatalog } from "./mockCourseCatalog";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseOptionRow = Database["public"]["Tables"]["exercise_options"]["Row"];
type ExerciseAnswerRow = Database["public"]["Tables"]["exercise_answers"]["Row"];

export async function getCourseCatalog(): Promise<CourseCatalog> {
  const candidate =
    mobileEnv.contentSource === "supabase" ? await fetchSupabaseCatalog() : mockCourseCatalog;
  const parsed = courseCatalogSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new Error("課程資料格式不完整，請稍後重試或切換內容來源。");
  }

  return parsed.data as CourseCatalog;
}

export function findCourse(catalog: CourseCatalog, courseId: string) {
  return catalog.courses.find((course) => course.id === courseId);
}

export function findUnit(catalog: CourseCatalog, unitId: string) {
  return catalog.courses.flatMap((course) => course.units).find((unit) => unit.id === unitId);
}

export function findLesson(catalog: CourseCatalog, lessonId: string): LessonContent | undefined {
  return catalog.courses
    .flatMap((course) => course.units)
    .flatMap((unit) => unit.lessons)
    .find((lesson) => lesson.id === lessonId);
}

export function getLessonExercises(lesson: LessonContent): FixedExercise[] {
  return lesson.activities
    .toSorted((left, right) => left.orderIndex - right.orderIndex)
    .flatMap((activity) => activity.exercises);
}

export function findExerciseContext(catalog: CourseCatalog, exerciseId: string) {
  for (const course of catalog.courses) {
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        const exercise = getLessonExercises(lesson).find((entry) => entry.id === exerciseId);
        if (exercise) {
          return { course, unit, lesson, exercise };
        }
      }
    }
  }

  return undefined;
}

async function fetchSupabaseCatalog(): Promise<CourseCatalog> {
  const [
    coursesResult,
    unitsResult,
    lessonsResult,
    activitiesResult,
    exercisesResult,
    optionsResult,
    answersResult,
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("status", "published").order("level"),
    supabase.from("units").select("*").eq("status", "published").order("order_index"),
    supabase.from("lessons").select("*").eq("status", "published").order("order_index"),
    supabase.from("activities").select("*").eq("status", "published").order("order_index"),
    supabase
      .from("exercises")
      .select("*")
      .eq("status", "published")
      .eq("review_status", "approved")
      .order("order_index"),
    supabase.from("exercise_options").select("*").order("order_index"),
    supabase.from("exercise_answers").select("*"),
  ]);

  const firstError = [
    coursesResult.error,
    unitsResult.error,
    lessonsResult.error,
    activitiesResult.error,
    exercisesResult.error,
    optionsResult.error,
    answersResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error(`無法載入 Supabase 課程資料：${firstError.message}`);
  }

  const optionsByExercise = groupBy(optionsResult.data ?? [], (row) => row.exercise_id);
  const answersByExercise = new Map(
    (answersResult.data ?? []).map((answer) => [answer.exercise_id, answer]),
  );
  const exercisesByActivity = groupBy(
    (exercisesResult.data ?? []).map((row) =>
      mapFixedExercise(row, optionsByExercise.get(row.id) ?? [], answersByExercise.get(row.id)),
    ),
    (exercise) => exercise.activityId,
  );
  const activitiesByLesson = groupBy(activitiesResult.data ?? [], (row) => row.lesson_id);
  const lessonsByUnit = groupBy(lessonsResult.data ?? [], (row) => row.unit_id);
  const unitsByCourse = groupBy(unitsResult.data ?? [], (row) => row.course_id);

  const catalog = {
    source: "supabase" as const,
    courses: (coursesResult.data ?? []).map((course) => ({
      id: course.id,
      level: course.level,
      titleZhTw: course.title_zh_tw,
      titleDe: course.title_de,
      descriptionZhTw: course.description_zh_tw,
      status: course.status,
      version: course.version,
      units: (unitsByCourse.get(course.id) ?? [])
        .toSorted((left, right) => left.order_index - right.order_index)
        .map((unit) => ({
          id: unit.id,
          courseId: unit.course_id,
          titleZhTw: unit.title_zh_tw,
          orderIndex: unit.order_index,
          status: unit.status,
          version: unit.version,
          lessons: (lessonsByUnit.get(unit.id) ?? [])
            .toSorted((left, right) => left.order_index - right.order_index)
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
              activities: (activitiesByLesson.get(lesson.id) ?? [])
                .toSorted((left, right) => left.order_index - right.order_index)
                .map((activity) => ({
                  id: activity.id,
                  lessonId: activity.lesson_id,
                  titleZhTw: activity.title_zh_tw,
                  type: activity.type,
                  orderIndex: activity.order_index,
                  exercises: (exercisesByActivity.get(activity.id) ?? [])
                    .toSorted((left, right) => left.orderIndex - right.orderIndex)
                    .map((entry) => entry.exercise),
                })),
            })),
        })),
    })),
  };

  return catalog as CourseCatalog;
}

function mapFixedExercise(
  row: ExerciseRow,
  optionRows: ExerciseOptionRow[],
  answerRow?: ExerciseAnswerRow,
): { activityId: string; exercise: FixedExercise; orderIndex: number } {
  if (!answerRow) {
    throw new Error(`題目 ${row.id} 缺少標準答案。`);
  }

  const payload = asObject(row.payload_json);
  const answer = asObject(answerRow.answer_json);
  const policy = gradingPolicySchema.parse(answerRow.grading_policy_json);
  const options = optionRows
    .toSorted((left, right) => left.order_index - right.order_index)
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
