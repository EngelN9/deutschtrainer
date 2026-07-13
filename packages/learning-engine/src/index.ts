import type {
  LearningAnalytics,
  LearningRecordSnapshot,
  MasteryBand,
  ReviewItem,
  SkillMastery,
} from "@deutschtrainer/shared-types";

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

export function getDueReviews(reviews: ReviewItem[], now = new Date()): ReviewItem[] {
  const nowTime = now.getTime();

  return reviews
    .filter(
      (review) =>
        review.status === "scheduled" && new Date(review.scheduledAt).getTime() <= nowTime,
    )
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    );
}

export function getMasteryBand(masteryScore: number): MasteryBand {
  if (masteryScore < 40) {
    return "not_mastered";
  }
  if (masteryScore < 60) {
    return "initial_understanding";
  }
  if (masteryScore < 75) {
    return "partially_mastered";
  }
  if (masteryScore < 90) {
    return "stable_mastery";
  }
  return "high_mastery";
}

export function calculateLearningAnalytics(
  snapshot: LearningRecordSnapshot,
  now = new Date(),
): LearningAnalytics {
  const correctAttempts = snapshot.attempts.filter((attempt) => attempt.isCorrect).length;
  const learningMinutes = Math.round(
    snapshot.attempts.reduce((total, attempt) => total + attempt.durationMs, 0) / 60000,
  );
  const masteryTotal = snapshot.mastery.reduce((total, mastery) => total + mastery.masteryScore, 0);
  const dailyActivity = createDailyActivity(snapshot, now);

  return {
    totalAttempts: snapshot.attempts.length,
    correctAttempts,
    accuracyPercent:
      snapshot.attempts.length === 0
        ? 0
        : Math.round((correctAttempts / snapshot.attempts.length) * 100),
    learningMinutes,
    dueReviewCount: getDueReviews(snapshot.reviews, now).length,
    errorCount: snapshot.errors.length,
    masteredSkillCount: snapshot.mastery.filter((mastery) => mastery.masteryScore >= 75).length,
    trackedSkillCount: snapshot.mastery.length,
    averageMasteryScore:
      snapshot.mastery.length === 0 ? 0 : Math.round(masteryTotal / snapshot.mastery.length),
    dailyActivity,
  };
}

function createDailyActivity(
  snapshot: LearningRecordSnapshot,
  now: Date,
): LearningAnalytics["dailyActivity"] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      date: toLocalDateKey(date),
      attemptCount: 0,
      durationMs: 0,
    };
  });
  const daysByDate = new Map(days.map((day) => [day.date, day]));

  for (const attempt of snapshot.attempts) {
    const day = daysByDate.get(toLocalDateKey(new Date(attempt.submittedAt)));
    if (day) {
      day.attemptCount += 1;
      day.durationMs += attempt.durationMs;
    }
  }

  return days.map((day) => ({
    date: day.date,
    attemptCount: day.attemptCount,
    learningMinutes: Math.round(day.durationMs / 60000),
  }));
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
