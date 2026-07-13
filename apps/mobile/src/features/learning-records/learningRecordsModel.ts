import type { GradingResult } from "@deutschtrainer/grading";
import { calculateNextMastery, scheduleReview } from "@deutschtrainer/learning-engine";
import type {
  Attempt,
  ErrorRecord,
  FixedExercise,
  LearningRecordSnapshot,
  LessonProgressRecord,
  ReviewItem,
  SkillMastery,
} from "@deutschtrainer/shared-types";

export interface LearningAttemptInput {
  userId: string;
  lessonId: string;
  exercise: FixedExercise;
  answer: unknown;
  gradingResult: GradingResult;
  submittedAt: string;
  durationMs: number;
  usedHint: boolean;
  mode: Attempt["mode"];
  idempotencyKey: string;
  totalExercises: number;
  reviewId?: string;
}

export function createEmptyLearningRecordSnapshot(): LearningRecordSnapshot {
  return {
    attempts: [],
    errors: [],
    mastery: [],
    reviews: [],
    lessonProgress: [],
    skillNames: {},
  };
}

export function recordLocalLearningAttempt(
  current: LearningRecordSnapshot,
  input: LearningAttemptInput,
): LearningRecordSnapshot {
  if (current.attempts.some((attempt) => attempt.idempotencyKey === input.idempotencyKey)) {
    return current;
  }

  const attemptId = `local-attempt:${input.idempotencyKey}`;
  const attempt: Attempt = {
    id: attemptId,
    userId: input.userId,
    exerciseId: input.exercise.id,
    lessonId: input.lessonId,
    submittedAt: input.submittedAt,
    score: input.gradingResult.score,
    isCorrect: input.gradingResult.isCorrect,
    durationMs: input.durationMs,
    usedHint: input.usedHint,
    mode: input.mode,
    idempotencyKey: input.idempotencyKey,
  };
  const reviews = current.reviews.map((review) =>
    input.reviewId &&
    review.exerciseId === input.exercise.id &&
    review.status === "scheduled" &&
    new Date(review.scheduledAt).getTime() <= new Date(input.submittedAt).getTime()
      ? { ...review, status: "completed" as const, completedAt: input.submittedAt }
      : review,
  );
  const mastery = [...current.mastery];
  const errors = [...current.errors];

  for (const skillId of input.exercise.skillIds) {
    const previous =
      mastery.find((entry) => entry.skillId === skillId) ??
      createInitialMastery(input.userId, skillId);
    const signal = {
      difficulty: input.exercise.difficulty,
      expectedResponseTimeMs: input.exercise.estimatedSeconds * 1000,
      isCorrect: input.gradingResult.isCorrect,
      responseTimeMs: input.durationMs,
      score: input.gradingResult.score,
      usedHint: input.usedHint,
    };
    const calculated = calculateNextMastery(previous, signal);
    const decision = scheduleReview(signal, calculated.correctStreak);
    const scheduledAt = addDays(input.submittedAt, decision.intervalDays);
    const nextMastery: SkillMastery = {
      ...calculated,
      lastPracticedAt: input.submittedAt,
      nextReviewAt: scheduledAt,
      lastErrorTypes: input.gradingResult.isCorrect
        ? calculated.lastErrorTypes
        : ["task_completion"],
    };
    const masteryIndex = mastery.findIndex((entry) => entry.skillId === skillId);
    if (masteryIndex >= 0) {
      mastery[masteryIndex] = nextMastery;
    } else {
      mastery.push(nextMastery);
    }

    if (!input.gradingResult.isCorrect) {
      errors.unshift(createErrorRecord(input, attemptId, skillId));
    }

    const reviewIndex = reviews.findIndex(
      (review) =>
        review.status === "scheduled" &&
        review.skillId === skillId &&
        review.exerciseId === input.exercise.id,
    );
    const nextReview: ReviewItem = {
      id:
        reviewIndex >= 0
          ? reviews[reviewIndex].id
          : `local-review:${input.idempotencyKey}:${skillId}`,
      userId: input.userId,
      skillId,
      exerciseId: input.exercise.id,
      priority: decision.priority,
      scheduledAt,
      reason: decision.reason,
      intervalDays: decision.intervalDays,
      easeFactor: calculateEaseFactor(
        reviewIndex >= 0 ? reviews[reviewIndex].easeFactor : 2.5,
        input,
      ),
      status: "scheduled",
      sourceAttemptId: attemptId,
    };
    if (reviewIndex >= 0) {
      reviews[reviewIndex] = nextReview;
    } else {
      reviews.push(nextReview);
    }
  }

  return {
    attempts: [attempt, ...current.attempts],
    errors,
    mastery,
    reviews,
    lessonProgress: updateLessonProgress(current.lessonProgress, current.attempts, input),
    skillNames: {
      ...current.skillNames,
      ...Object.fromEntries(input.exercise.skillIds.map((skillId) => [skillId, skillId])),
    },
  };
}

function createInitialMastery(userId: string, skillId: string): SkillMastery {
  return {
    userId,
    skillId,
    masteryScore: 0,
    confidenceScore: 0,
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    hintCount: 0,
    averageResponseTimeMs: 0,
    correctStreak: 0,
    incorrectStreak: 0,
    lastErrorTypes: [],
  };
}

function createErrorRecord(
  input: LearningAttemptInput,
  attemptId: string,
  skillId: string,
): ErrorRecord {
  return {
    id: `local-error:${input.idempotencyKey}:${skillId}`,
    userId: input.userId,
    attemptId,
    exerciseId: input.exercise.id,
    lessonId: input.lessonId,
    skillId,
    type: "task_completion",
    severity: input.gradingResult.score === 0 ? "major" : "moderate",
    original: formatValue(input.answer),
    correction: formatValue(input.gradingResult.acceptedAnswer),
    explanationZhTw:
      input.exercise.type === "error_correction"
        ? input.exercise.explanationZhTw
        : "請重新比較題目與參考答案。",
    createdAt: input.submittedAt,
  };
}

function updateLessonProgress(
  current: LessonProgressRecord[],
  attempts: Attempt[],
  input: LearningAttemptInput,
): LessonProgressRecord[] {
  const previous = current.find((progress) => progress.lessonId === input.lessonId);
  const completedExerciseIds = unique([
    ...(previous?.completedExerciseIds ?? []),
    input.exercise.id,
  ]);
  const completionPercent =
    input.totalExercises === 0
      ? 0
      : Math.min(100, Math.round((completedExerciseIds.length / input.totalExercises) * 100));
  const completedAt =
    completionPercent >= 100 ? (previous?.completedAt ?? input.submittedAt) : undefined;
  const correctExerciseIds = unique([
    ...attempts
      .filter((attempt) => attempt.lessonId === input.lessonId && attempt.isCorrect)
      .map((attempt) => attempt.exerciseId),
    ...(input.gradingResult.isCorrect ? [input.exercise.id] : []),
  ]);
  const next: LessonProgressRecord = {
    userId: input.userId,
    lessonId: input.lessonId,
    status: completionPercent >= 100 ? "completed" : "in_progress",
    completionPercent,
    completedExerciseIds,
    correctExerciseCount: correctExerciseIds.length,
    attemptedExerciseCount: completedExerciseIds.length,
    lastPracticedAt: input.submittedAt,
    ...(completedAt ? { completedAt } : {}),
  };

  return previous
    ? current.map((progress) => (progress.lessonId === input.lessonId ? next : progress))
    : [...current, next];
}

function calculateEaseFactor(previous: number, input: LearningAttemptInput): number {
  return input.gradingResult.isCorrect
    ? Math.min(3, previous + 0.05)
    : Math.max(1.3, previous - 0.2);
}

function addDays(value: string, days: number): string {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
