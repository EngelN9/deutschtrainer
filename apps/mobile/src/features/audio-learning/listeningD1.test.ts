import { describe, expect, it } from "@jest/globals";
import {
  getListeningD1Exercise,
  getListeningD1ExercisesForLevel,
  gradeListeningD1Exercise,
  listeningD1ExerciseSchema,
} from "./listeningD1";

const exerciseId = "7bdc1dd6-8f39-4cb9-a5f3-c0d3a4270031";

function requireExercise() {
  const exercise = getListeningD1Exercise(exerciseId);
  if (!exercise) {
    throw new Error("Listening D1 fixture is missing.");
  }
  return exercise;
}

describe("Listening D1", () => {
  it("keeps the curated exercise schema-valid with four deterministic questions", () => {
    const exercise = requireExercise();

    expect(listeningD1ExerciseSchema.safeParse(exercise).success).toBe(true);
    expect(exercise.vocabularySupport).toHaveLength(4);
    expect(new Set(exercise.vocabularySupport.map((entry) => entry.termDe)).size).toBe(4);
    expect(
      exercise.vocabularySupport.every(
        (entry) => entry.termDe.trim().length > 0 && entry.explanationZhTw.trim().length > 0,
      ),
    ).toBe(true);
    expect(exercise.questions).toHaveLength(4);
    expect(exercise.estimatedSeconds).toBeGreaterThanOrEqual(30);
    expect(exercise.estimatedSeconds).toBeLessThanOrEqual(90);
    expect(exercise.source.modified).toBe(false);
  });

  it("offers the B1 exercise to B1 and B2 learners without expanding D1 to C1 or C2", () => {
    expect(getListeningD1ExercisesForLevel("B1")).toHaveLength(1);
    expect(getListeningD1ExercisesForLevel("B2")).toHaveLength(1);
    expect(getListeningD1ExercisesForLevel("C1")).toHaveLength(0);
    expect(getListeningD1ExercisesForLevel("C2")).toHaveLength(0);
  });

  it("rejects duplicate vocabulary support terms", () => {
    const exercise = requireExercise();
    const duplicateVocabulary = exercise.vocabularySupport.map((entry, index) =>
      index === 1
        ? { ...entry, termDe: exercise.vocabularySupport[0]?.termDe ?? entry.termDe }
        : entry,
    );

    expect(
      listeningD1ExerciseSchema.safeParse({
        ...exercise,
        vocabularySupport: duplicateVocabulary,
      }).success,
    ).toBe(false);
  });

  it("returns a deterministic 100 score for the fixed answer key", () => {
    const exercise = requireExercise();
    const answers = Object.fromEntries(
      exercise.questions.map((question) => [question.id, question.correctOptionKey]),
    );

    const first = gradeListeningD1Exercise(exercise, answers);
    const replay = gradeListeningD1Exercise(exercise, answers);

    expect(first).toEqual(replay);
    expect(first).toMatchObject({
      status: "completed",
      score: 100,
      correctCount: 4,
      totalCount: 4,
    });
  });

  it("awards deterministic partial credit per question", () => {
    const exercise = requireExercise();
    const answers = Object.fromEntries(
      exercise.questions.map((question, index) => [
        question.id,
        index === 0 ? "b" : question.correctOptionKey,
      ]),
    );

    expect(gradeListeningD1Exercise(exercise, answers)).toMatchObject({
      status: "completed",
      score: 75,
      correctCount: 3,
      totalCount: 4,
    });
  });

  it("rejects missing, unknown, and invalid option answers", () => {
    const exercise = requireExercise();
    const firstQuestion = exercise.questions[0];
    if (!firstQuestion) {
      throw new Error("Listening D1 fixture has no questions.");
    }

    expect(gradeListeningD1Exercise(exercise, {})).toEqual({
      status: "invalid",
      message: "請完成所有題目後再提交。",
    });
    expect(
      gradeListeningD1Exercise(exercise, {
        [firstQuestion.id]: "not-an-option",
      }),
    ).toEqual({
      status: "invalid",
      message: "請完成所有題目後再提交。",
    });
  });
});
