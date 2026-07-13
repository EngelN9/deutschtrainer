import { describe, expect, it } from "@jest/globals";
import type {
  LearningRecordSnapshot,
  ReviewItem,
  SkillMastery,
} from "@deutschtrainer/shared-types";
import {
  calculateLearningAnalytics,
  calculateNextMastery,
  getDueReviews,
  getMasteryBand,
  scheduleReview,
} from "./index";

const baseMastery: SkillMastery = {
  userId: "user-1",
  skillId: "B1.word_order.subordinate_clause",
  masteryScore: 50,
  confidenceScore: 50,
  attemptCount: 2,
  correctCount: 1,
  incorrectCount: 1,
  hintCount: 0,
  averageResponseTimeMs: 3000,
  correctStreak: 0,
  incorrectStreak: 1,
  lastErrorTypes: ["word_order"],
};

describe("learning engine", () => {
  it("raises mastery for correct answers without hints", () => {
    const mastery = calculateNextMastery(baseMastery, {
      difficulty: 3,
      expectedResponseTimeMs: 4000,
      isCorrect: true,
      responseTimeMs: 3000,
      score: 100,
      usedHint: false,
    });

    expect(mastery.masteryScore).toBeGreaterThan(baseMastery.masteryScore);
    expect(mastery.correctStreak).toBe(1);
  });

  it("schedules same-day review for incorrect answers", () => {
    const decision = scheduleReview(
      {
        difficulty: 2,
        expectedResponseTimeMs: 4000,
        isCorrect: false,
        responseTimeMs: 2000,
        score: 0,
        usedHint: false,
      },
      0,
    );

    expect(decision.intervalDays).toBe(0);
    expect(decision.priority).toBe(100);
  });

  it.each([
    { expectedDays: 1, streak: 1, usedHint: true, responseTimeMs: 2000 },
    { expectedDays: 3, streak: 1, usedHint: false, responseTimeMs: 7000 },
    { expectedDays: 14, streak: 3, usedHint: false, responseTimeMs: 2000 },
    { expectedDays: 30, streak: 6, usedHint: false, responseTimeMs: 2000 },
  ])("applies the fixed review interval rules", ({ expectedDays, ...scenario }) => {
    const decision = scheduleReview(
      {
        difficulty: 3,
        expectedResponseTimeMs: 4000,
        isCorrect: true,
        responseTimeMs: scenario.responseTimeMs,
        score: 100,
        usedHint: scenario.usedHint,
      },
      scenario.streak,
    );

    expect(decision.intervalDays).toBe(expectedDays);
  });

  it("sorts only due scheduled reviews by priority", () => {
    const reviews: ReviewItem[] = [
      createReview("low", 30, "2026-07-10T00:00:00.000Z"),
      createReview("future", 100, "2026-07-14T00:00:00.000Z"),
      createReview("high", 90, "2026-07-11T00:00:00.000Z"),
      { ...createReview("done", 100, "2026-07-10T00:00:00.000Z"), status: "completed" },
    ];

    expect(
      getDueReviews(reviews, new Date("2026-07-13T00:00:00.000Z")).map(({ id }) => id),
    ).toEqual(["high", "low"]);
  });

  it("uses the specification mastery bands", () => {
    expect(getMasteryBand(39)).toBe("not_mastered");
    expect(getMasteryBand(59)).toBe("initial_understanding");
    expect(getMasteryBand(74)).toBe("partially_mastered");
    expect(getMasteryBand(89)).toBe("stable_mastery");
    expect(getMasteryBand(90)).toBe("high_mastery");
  });

  it("calculates learning analytics and seven-day activity", () => {
    const snapshot: LearningRecordSnapshot = {
      attempts: [
        {
          id: "attempt-1",
          userId: "user-1",
          exerciseId: "exercise-1",
          lessonId: "lesson-1",
          submittedAt: "2026-07-13T02:00:00.000Z",
          score: 100,
          isCorrect: true,
          durationMs: 120000,
          usedHint: false,
          mode: "lesson",
          idempotencyKey: "attempt-key-1",
        },
        {
          id: "attempt-2",
          userId: "user-1",
          exerciseId: "exercise-2",
          lessonId: "lesson-1",
          submittedAt: "2026-07-13T03:00:00.000Z",
          score: 0,
          isCorrect: false,
          durationMs: 60000,
          usedHint: false,
          mode: "lesson",
          idempotencyKey: "attempt-key-2",
        },
      ],
      errors: [],
      lessonProgress: [],
      mastery: [baseMastery],
      reviews: [createReview("due", 100, "2026-07-13T00:00:00.000Z")],
      skillNames: {},
    };

    const analytics = calculateLearningAnalytics(snapshot, new Date("2026-07-13T12:00:00.000Z"));

    expect(analytics.totalAttempts).toBe(2);
    expect(analytics.accuracyPercent).toBe(50);
    expect(analytics.learningMinutes).toBe(3);
    expect(analytics.dueReviewCount).toBe(1);
    expect(analytics.dailyActivity).toHaveLength(7);
    expect(analytics.dailyActivity.at(-1)?.attemptCount).toBe(2);
  });
});

function createReview(id: string, priority: number, scheduledAt: string): ReviewItem {
  return {
    id,
    userId: "user-1",
    skillId: "skill-1",
    exerciseId: "exercise-1",
    priority,
    scheduledAt,
    reason: "incorrect_answer",
    intervalDays: 0,
    easeFactor: 2.5,
    status: "scheduled",
  };
}
