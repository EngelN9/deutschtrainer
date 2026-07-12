import { describe, expect, it } from "@jest/globals";
import {
  emptyUserProgress,
  getLessonCompletionPercent,
  recordExerciseResult,
  resetLessonProgress,
} from "./progressModel";

describe("progress model", () => {
  it("records unique exercises and marks a lesson complete", () => {
    const first = recordExerciseResult(emptyUserProgress, {
      exerciseIndex: 0,
      totalExercises: 2,
      result: {
        exerciseId: "exercise-1",
        lessonId: "lesson-1",
        score: 100,
        isCorrect: true,
        submittedAt: "2026-07-11T00:00:00.000Z",
      },
    });
    const completed = recordExerciseResult(first, {
      exerciseIndex: 1,
      totalExercises: 2,
      result: {
        exerciseId: "exercise-2",
        lessonId: "lesson-1",
        score: 0,
        isCorrect: false,
        submittedAt: "2026-07-11T00:01:00.000Z",
      },
    });

    expect(completed.lessons["lesson-1"]?.completedAt).toBeDefined();
    expect(getLessonCompletionPercent(completed.lessons["lesson-1"], 2)).toBe(100);
  });

  it("updates a repeated answer without duplicating completion", () => {
    const first = recordExerciseResult(emptyUserProgress, {
      exerciseIndex: 0,
      totalExercises: 1,
      result: {
        exerciseId: "exercise-1",
        lessonId: "lesson-1",
        score: 0,
        isCorrect: false,
        submittedAt: "2026-07-11T00:00:00.000Z",
      },
    });
    const corrected = recordExerciseResult(first, {
      exerciseIndex: 0,
      totalExercises: 1,
      result: {
        exerciseId: "exercise-1",
        lessonId: "lesson-1",
        score: 100,
        isCorrect: true,
        submittedAt: "2026-07-11T00:02:00.000Z",
      },
    });

    expect(corrected.lessons["lesson-1"]?.completedExerciseIds).toEqual(["exercise-1"]);
    expect(corrected.lessons["lesson-1"]?.correctExerciseIds).toEqual(["exercise-1"]);
  });

  it("removes one lesson without affecting other lessons", () => {
    const one = recordExerciseResult(emptyUserProgress, {
      exerciseIndex: 0,
      totalExercises: 1,
      result: {
        exerciseId: "exercise-1",
        lessonId: "lesson-1",
        score: 100,
        isCorrect: true,
        submittedAt: "2026-07-11T00:00:00.000Z",
      },
    });
    const two = recordExerciseResult(one, {
      exerciseIndex: 0,
      totalExercises: 1,
      result: {
        exerciseId: "exercise-2",
        lessonId: "lesson-2",
        score: 100,
        isCorrect: true,
        submittedAt: "2026-07-11T00:01:00.000Z",
      },
    });

    const reset = resetLessonProgress(two, "lesson-1");
    expect(reset.lessons["lesson-1"]).toBeUndefined();
    expect(reset.lessons["lesson-2"]).toBeDefined();
  });
});
