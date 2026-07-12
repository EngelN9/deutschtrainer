import type { SkillMastery } from "@deutschtrainer/shared-types";

export interface AttemptSignal {
  isCorrect: boolean;
  usedHint: boolean;
  responseTimeMs: number;
  expectedResponseTimeMs: number;
  difficulty: number;
  score: number;
}

export interface ReviewScheduleDecision {
  intervalDays: number;
  priority: number;
  reason: string;
}

export function calculateNextMastery(previous: SkillMastery, signal: AttemptSignal): SkillMastery {
  const speedPenalty = signal.responseTimeMs > signal.expectedResponseTimeMs * 1.5 ? 5 : 0;
  const hintPenalty = signal.usedHint ? 8 : 0;
  const difficultyBonus = Math.max(0, signal.difficulty - 2);
  const rawDelta = signal.isCorrect
    ? 8 + difficultyBonus - speedPenalty - hintPenalty
    : -12 - signal.difficulty;
  const masteryScore = clamp(previous.masteryScore + rawDelta, 0, 100);
  const attemptCount = previous.attemptCount + 1;
  const correctCount = previous.correctCount + (signal.isCorrect ? 1 : 0);
  const incorrectCount = previous.incorrectCount + (signal.isCorrect ? 0 : 1);
  const averageResponseTimeMs =
    (previous.averageResponseTimeMs * previous.attemptCount + signal.responseTimeMs) / attemptCount;

  return {
    ...previous,
    masteryScore,
    confidenceScore: clamp(previous.confidenceScore + (signal.isCorrect ? 4 : -6), 0, 100),
    attemptCount,
    correctCount,
    incorrectCount,
    hintCount: previous.hintCount + (signal.usedHint ? 1 : 0),
    averageResponseTimeMs,
    correctStreak: signal.isCorrect ? previous.correctStreak + 1 : 0,
    incorrectStreak: signal.isCorrect ? 0 : previous.incorrectStreak + 1,
  };
}

export function scheduleReview(
  signal: AttemptSignal,
  correctStreak: number,
): ReviewScheduleDecision {
  if (!signal.isCorrect) {
    return { intervalDays: 0, priority: 100, reason: "incorrect_answer" };
  }

  if (signal.usedHint) {
    return { intervalDays: 1, priority: 80, reason: "correct_with_hint" };
  }

  if (signal.responseTimeMs > signal.expectedResponseTimeMs * 1.5) {
    return { intervalDays: 3, priority: 60, reason: "correct_but_slow" };
  }

  if (correctStreak >= 6) {
    return { intervalDays: 30, priority: 20, reason: "long_term_stable" };
  }

  if (correctStreak >= 3) {
    return { intervalDays: 14, priority: 30, reason: "stable_multiple_times" };
  }

  return { intervalDays: 7, priority: 40, reason: "correct_and_stable" };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
