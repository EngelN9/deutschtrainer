import type { ExerciseProgressResult, LessonProgressSnapshot } from "@deutschtrainer/shared-types";
import {
  createEmptyLearningRecordSnapshot,
  recordLocalLearningAttempt,
  type LearningAttemptInput,
} from "../learning-records/learningRecordsModel";

export interface UserLearningProgress {
  exerciseResults: Record<string, ExerciseProgressResult>;
  lessons: Record<string, LessonProgressSnapshot>;
  learningRecords: ReturnType<typeof createEmptyLearningRecordSnapshot>;
}

export const emptyUserProgress: UserLearningProgress = {
  exerciseResults: {},
  lessons: {},
  learningRecords: createEmptyLearningRecordSnapshot(),
};

interface RecordExerciseInput {
  exerciseIndex: number;
  result: ExerciseProgressResult;
  totalExercises: number;
}

export function recordExerciseResult(
  current: UserLearningProgress,
  input: RecordExerciseInput,
): UserLearningProgress {
  const previousLesson = current.lessons[input.result.lessonId];
  const completedExerciseIds = unique([
    ...(previousLesson?.completedExerciseIds ?? []),
    input.result.exerciseId,
  ]);
  const previousCorrect = previousLesson?.correctExerciseIds ?? [];
  const correctExerciseIds = input.result.isCorrect
    ? unique([...previousCorrect, input.result.exerciseId])
    : previousCorrect.filter((exerciseId) => exerciseId !== input.result.exerciseId);
  const completed = completedExerciseIds.length >= input.totalExercises;
  const updatedAt = input.result.submittedAt;

  return {
    ...current,
    exerciseResults: {
      ...current.exerciseResults,
      [input.result.exerciseId]: input.result,
    },
    lessons: {
      ...current.lessons,
      [input.result.lessonId]: {
        lessonId: input.result.lessonId,
        completedExerciseIds,
        correctExerciseIds,
        currentExerciseIndex: Math.min(
          input.exerciseIndex + 1,
          Math.max(input.totalExercises - 1, 0),
        ),
        ...(completed ? { completedAt: previousLesson?.completedAt ?? updatedAt } : {}),
        updatedAt,
      },
    },
  };
}

export function resetLessonProgress(
  current: UserLearningProgress,
  lessonId: string,
): UserLearningProgress {
  const lesson = current.lessons[lessonId];

  if (!lesson) {
    return current;
  }

  const lessons = { ...current.lessons };
  delete lessons[lessonId];
  const exerciseResults = { ...current.exerciseResults };
  for (const exerciseId of lesson.completedExerciseIds) {
    delete exerciseResults[exerciseId];
  }

  return { ...current, exerciseResults, lessons };
}

export function recordLearningAttempt(
  current: UserLearningProgress,
  input: LearningAttemptInput & { exerciseIndex: number },
): UserLearningProgress {
  const normalized: UserLearningProgress = {
    ...current,
    learningRecords: current.learningRecords ?? createEmptyLearningRecordSnapshot(),
  };
  const withExerciseProgress = recordExerciseResult(normalized, {
    exerciseIndex: input.exerciseIndex,
    result: {
      exerciseId: input.exercise.id,
      lessonId: input.lessonId,
      score: input.gradingResult.score,
      isCorrect: input.gradingResult.isCorrect,
      submittedAt: input.submittedAt,
    },
    totalExercises: input.totalExercises,
  });

  return {
    ...withExerciseProgress,
    learningRecords: recordLocalLearningAttempt(normalized.learningRecords, input),
  };
}

export function getLessonCompletionPercent(
  lesson: LessonProgressSnapshot | undefined,
  totalExercises: number,
): number {
  if (!lesson || totalExercises === 0) {
    return 0;
  }

  return Math.round((lesson.completedExerciseIds.length / totalExercises) * 100);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
