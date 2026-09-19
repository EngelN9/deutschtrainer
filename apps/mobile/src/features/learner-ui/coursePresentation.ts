import type {
  CatalogCourse,
  LessonProgressRecord,
  LessonProgressSnapshot,
} from "@deutschtrainer/shared-types";

export type LearningStatus = "not_started" | "in_progress" | "completed" | "locked";
export type OfflineAvailability =
  "online_only" | "downloaded" | "update_available" | "offline_unavailable";

export function resolveLessonLearningStatus(
  lessonId: string,
  remoteProgress?: LessonProgressRecord,
  localProgress?: LessonProgressSnapshot,
): Exclude<LearningStatus, "locked"> {
  if (remoteProgress?.status === "completed" || localProgress?.completedAt) {
    return "completed";
  }
  if (
    remoteProgress?.status === "in_progress" ||
    (localProgress && localProgress.completedExerciseIds.length > 0)
  ) {
    return "in_progress";
  }
  return "not_started";
}

export function resolveCourseLearningStatus(
  course: CatalogCourse,
  remoteProgress: LessonProgressRecord[],
  localProgress: Record<string, LessonProgressSnapshot> | undefined,
): Exclude<LearningStatus, "locked"> {
  const lessons = course.units.flatMap((unit) => unit.lessons);
  const statuses = lessons.map((lesson) =>
    resolveLessonLearningStatus(
      lesson.id,
      remoteProgress.find((progress) => progress.lessonId === lesson.id),
      localProgress?.[lesson.id],
    ),
  );
  if (statuses.length > 0 && statuses.every((status) => status === "completed")) {
    return "completed";
  }
  return statuses.some((status) => status !== "not_started") ? "in_progress" : "not_started";
}

export function resolveOfflineAvailability(input: {
  downloaded: boolean;
  offline: boolean;
  updateAvailable: boolean;
}): OfflineAvailability {
  if (input.updateAvailable) return "update_available";
  if (input.downloaded) return "downloaded";
  if (input.offline) return "offline_unavailable";
  return "online_only";
}

export function findContinueLesson(
  course: CatalogCourse,
  remoteProgress: LessonProgressRecord[],
  localProgress: Record<string, LessonProgressSnapshot> | undefined,
) {
  const lessons = course.units.flatMap((unit) => unit.lessons);
  return (
    lessons.find(
      (lesson) =>
        resolveLessonLearningStatus(
          lesson.id,
          remoteProgress.find((progress) => progress.lessonId === lesson.id),
          localProgress?.[lesson.id],
        ) !== "completed",
    ) ?? lessons[0]
  );
}
