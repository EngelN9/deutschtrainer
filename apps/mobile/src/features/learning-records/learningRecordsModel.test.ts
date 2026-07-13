import { describe, expect, it } from "@jest/globals";
import type { FillBlankExercise } from "@deutschtrainer/shared-types";
import { gradeFixedExercise } from "@deutschtrainer/grading";
import {
  createEmptyLearningRecordSnapshot,
  recordLocalLearningAttempt,
  type LearningAttemptInput,
} from "./learningRecordsModel";

const exercise: FillBlankExercise = {
  id: "10000000-0000-4000-8000-000000000201",
  level: "B1",
  type: "fill_blank",
  title: "從屬子句填空",
  instructionZhTw: "完成句子。",
  promptDe: "Ich bleibe zu Hause, weil es ___.",
  skillIds: ["B1.word_order.subordinate_clause"],
  grammarTopicIds: [],
  vocabularyIds: [],
  estimatedSeconds: 30,
  difficulty: 2,
  sourceType: "human",
  reviewStatus: "approved",
  version: 1,
  answer: { acceptedAnswers: ["regnet"] },
  gradingPolicy: {
    caseSensitive: false,
    ignorePunctuation: true,
    normalizeGermanCharacters: true,
    allowPartialCredit: false,
    acceptedAlternatives: [],
  },
};

describe("local learning records", () => {
  it("creates an error and due review after an incorrect answer", () => {
    const input = createInput("schneit", "attempt-wrong", "2026-07-13T08:00:00.000Z");
    const snapshot = recordLocalLearningAttempt(createEmptyLearningRecordSnapshot(), input);

    expect(snapshot.attempts).toHaveLength(1);
    expect(snapshot.errors).toHaveLength(1);
    expect(snapshot.reviews[0]).toMatchObject({
      intervalDays: 0,
      priority: 100,
      scheduledAt: input.submittedAt,
      status: "scheduled",
    });
    expect(snapshot.mastery[0]).toMatchObject({
      attemptCount: 1,
      incorrectCount: 1,
      incorrectStreak: 1,
    });
  });

  it("does not count an idempotent replay twice", () => {
    const input = createInput("regnet", "attempt-once", "2026-07-13T09:00:00.000Z");
    const first = recordLocalLearningAttempt(createEmptyLearningRecordSnapshot(), input);
    const replay = recordLocalLearningAttempt(first, input);

    expect(replay).toBe(first);
    expect(replay.attempts).toHaveLength(1);
    expect(replay.mastery[0].attemptCount).toBe(1);
  });

  it("completes the due review and schedules the next interval", () => {
    const wrong = recordLocalLearningAttempt(
      createEmptyLearningRecordSnapshot(),
      createInput("schneit", "attempt-wrong", "2026-07-13T08:00:00.000Z"),
    );
    const dueReview = wrong.reviews[0];
    const correctInput = createInput("regnet", "attempt-review", "2026-07-13T10:00:00.000Z");
    const reviewed = recordLocalLearningAttempt(wrong, {
      ...correctInput,
      mode: "review",
      reviewId: dueReview.id,
    });

    expect(reviewed.reviews.filter((review) => review.status === "completed")).toHaveLength(1);
    expect(reviewed.reviews.filter((review) => review.status === "scheduled")).toHaveLength(1);
    expect(reviewed.reviews.find((review) => review.status === "scheduled")?.intervalDays).toBe(7);
    expect(reviewed.attempts[0].mode).toBe("review");
  });
});

function createInput(
  answer: string,
  idempotencyKey: string,
  submittedAt: string,
): LearningAttemptInput {
  return {
    userId: "user-1",
    lessonId: "lesson-1",
    exercise,
    answer,
    gradingResult: gradeFixedExercise(exercise, answer),
    submittedAt,
    durationMs: 5000,
    usedHint: false,
    mode: "lesson",
    idempotencyKey,
    totalExercises: 1,
  };
}
