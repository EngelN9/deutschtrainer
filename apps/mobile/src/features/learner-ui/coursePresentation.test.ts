import { describe, expect, it } from "@jest/globals";
import type {
  CatalogCourse,
  LessonProgressRecord,
  LessonProgressSnapshot,
} from "@deutschtrainer/shared-types";
import {
  findContinueLesson,
  resolveCourseLearningStatus,
  resolveLessonLearningStatus,
  resolveOfflineAvailability,
} from "./coursePresentation";

const course = {
  units: [{ lessons: [{ id: "lesson-1" }, { id: "lesson-2" }] }],
} as CatalogCourse;

describe("course presentation", () => {
  it("prefers server-authoritative lesson status", () => {
    const remote = { lessonId: "lesson-1", status: "completed" } as LessonProgressRecord;
    expect(resolveLessonLearningStatus("lesson-1", remote)).toBe("completed");
  });

  it("recognizes local in-progress and completed lessons", () => {
    const progress = { completedExerciseIds: ["exercise-1"] } as LessonProgressSnapshot;
    expect(resolveLessonLearningStatus("lesson-1", undefined, progress)).toBe("in_progress");
    expect(
      resolveLessonLearningStatus("lesson-1", undefined, {
        ...progress,
        completedAt: "2026-09-16T00:00:00Z",
      }),
    ).toBe("completed");
  });

  it("derives course status and the first unfinished lesson", () => {
    const progress = [
      { lessonId: "lesson-1", status: "completed" },
      { lessonId: "lesson-2", status: "in_progress" },
    ] as LessonProgressRecord[];
    expect(resolveCourseLearningStatus(course, progress, undefined)).toBe("in_progress");
    expect(findContinueLesson(course, progress, undefined)?.id).toBe("lesson-2");
  });

  it("distinguishes downloaded, update, online, and offline-unavailable states", () => {
    expect(
      resolveOfflineAvailability({ downloaded: true, offline: false, updateAvailable: false }),
    ).toBe("downloaded");
    expect(
      resolveOfflineAvailability({ downloaded: true, offline: false, updateAvailable: true }),
    ).toBe("update_available");
    expect(
      resolveOfflineAvailability({ downloaded: false, offline: true, updateAvailable: false }),
    ).toBe("offline_unavailable");
    expect(
      resolveOfflineAvailability({ downloaded: false, offline: false, updateAvailable: false }),
    ).toBe("online_only");
  });
});
