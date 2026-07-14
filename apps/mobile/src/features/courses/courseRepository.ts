import {
  AI_EVALUATED_EXERCISE_TYPES,
  FIXED_EXERCISE_TYPES,
  type AiEvaluatedExercise,
  type CourseCatalog,
  type FixedExercise,
  type LessonContent,
  type LessonExercise,
} from "@deutschtrainer/shared-types";
import { courseCatalogSchema, courseListResponseSchema } from "@deutschtrainer/validation";
import { requestApi } from "../../lib/apiClient";
import { mobileEnv } from "../../lib/env";
import { mockCourseCatalog } from "./mockCourseCatalog";

export async function getCourseCatalog(): Promise<CourseCatalog> {
  const candidate =
    mobileEnv.contentSource === "api"
      ? await requestApi("/courses", courseListResponseSchema, {
          fallbackMessage: "課程服務回傳格式不完整，請稍後重試。",
        })
      : mockCourseCatalog;
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

export function getLessonExercises(lesson: LessonContent): LessonExercise[] {
  return [...lesson.activities]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .flatMap((activity) => activity.exercises);
}

export function isFixedExercise(exercise: LessonExercise): exercise is FixedExercise {
  return (FIXED_EXERCISE_TYPES as readonly string[]).includes(exercise.type);
}

export function isAiEvaluatedExercise(exercise: LessonExercise): exercise is AiEvaluatedExercise {
  return (AI_EVALUATED_EXERCISE_TYPES as readonly string[]).includes(exercise.type);
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
