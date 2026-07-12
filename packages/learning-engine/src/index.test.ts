import { describe, expect, it } from "@jest/globals";
import type { SkillMastery } from "@deutschtrainer/shared-types";
import { calculateNextMastery, scheduleReview } from "./index";

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
});
