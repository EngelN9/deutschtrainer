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
import { isNetworkApiError, requestApi } from "../../lib/apiClient";
import { mobileEnv } from "../../lib/env";
import { useConnectivityStore } from "../offline/connectivityStore";
import { getOfflineCatalog } from "../offline/offlineModel";
import { useOfflineStore } from "../offline/useOfflineStore";
import { mockCourseCatalog } from "./mockCourseCatalog";

export async function getCourseCatalog(profileId?: string): Promise<CourseCatalog> {
  let candidate: unknown = mockCourseCatalog;
  if (mobileEnv.contentSource === "api") {
    if (useConnectivityStore.getState().status === "offline") {
      candidate = requireOfflineCatalog(profileId);
    } else {
      try {
        candidate = await requestApi("/courses", courseListResponseSchema, {
          fallbackMessage: "課程服務回傳格式不完整，請稍後重試。",
        });
      } catch (error) {
        if (!isNetworkApiError(error)) {
          throw error;
        }
        candidate = requireOfflineCatalog(profileId);
      }
    }
  }
  const parsed = courseCatalogSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("課程資料格式不完整，請稍後重試或切換內容來源。");
  }
  return parsed.data as CourseCatalog;
}

function requireOfflineCatalog(profileId?: string): CourseCatalog {
  const catalog = profileId
    ? getOfflineCatalog(useOfflineStore.getState().profiles, profileId)
    : { source: "offline" as const, courses: [] };
  if (catalog.courses.length === 0) {
    throw new Error("目前沒有網路，也尚未下載任何課程。");
  }
  return catalog;
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
