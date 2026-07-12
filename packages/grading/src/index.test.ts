import { describe, expect, it } from "@jest/globals";
import {
  gradeMatching,
  gradeMultipleChoice,
  gradeMultipleSelect,
  gradeSentenceOrder,
  gradeTextAnswer,
  normalizeAnswer,
} from "./index";
import type {
  MatchingExercise,
  MultipleSelectExercise,
  SentenceOrderExercise,
} from "@deutschtrainer/shared-types";

const baseExercise = {
  id: "exercise-1",
  level: "B1" as const,
  title: "從句語序",
  instructionZhTw: "完成題目。",
  promptDe: "Bearbeite die Aufgabe.",
  skillIds: ["B1.word_order.subordinate_clause"],
  grammarTopicIds: [],
  vocabularyIds: [],
  estimatedSeconds: 30,
  difficulty: 2,
  sourceType: "human" as const,
  reviewStatus: "approved" as const,
  version: 1,
};

const gradingPolicy = {
  acceptedAlternatives: [],
  allowPartialCredit: true,
  caseSensitive: false,
  ignorePunctuation: true,
  normalizeGermanCharacters: true,
};

describe("grading", () => {
  it("normalizes German replacement spellings when enabled", () => {
    expect(
      normalizeAnswer("  Ich gruesse Sie! ", {
        caseSensitive: false,
        ignorePunctuation: true,
        normalizeGermanCharacters: true,
      }),
    ).toBe("ich grüße sie");
  });

  it("grades accepted alternatives", () => {
    const result = gradeTextAnswer("Obwohl es teuer ist.", ["Obwohl es teuer ist"], {
      acceptedAlternatives: [],
      allowPartialCredit: false,
      caseSensitive: false,
      ignorePunctuation: true,
      normalizeGermanCharacters: true,
    });

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
  });

  it("grades multiple choice by option id", () => {
    const result = gradeMultipleChoice(
      {
        ...baseExercise,
        type: "multiple_choice",
        options: [],
        answer: { optionId: "option-a" },
      },
      "option-a",
    );

    expect(result.isCorrect).toBe(true);
  });

  it("awards guarded partial credit for multiple select", () => {
    const exercise: MultipleSelectExercise = {
      ...baseExercise,
      type: "multiple_select",
      options: [],
      answer: { optionIds: ["a", "b"] },
      requireAllCorrect: false,
      gradingPolicy,
    };

    expect(gradeMultipleSelect(exercise, ["a"]).score).toBe(50);
    expect(gradeMultipleSelect(exercise, ["a", "c"]).score).toBe(0);
  });

  it("grades sentence order by position", () => {
    const exercise: SentenceOrderExercise = {
      ...baseExercise,
      type: "sentence_order",
      segments: [],
      answer: { segmentIds: ["a", "b", "c"] },
      allowPartialCredit: true,
    };

    expect(gradeSentenceOrder(exercise, ["a", "c", "b"]).score).toBe(33);
  });

  it("grades matching pairs with partial credit", () => {
    const exercise: MatchingExercise = {
      ...baseExercise,
      type: "matching",
      leftItems: [],
      rightItems: [],
      answer: { pairs: { a: "one", b: "two" } },
      allowPartialCredit: true,
    };

    const result = gradeMatching(exercise, { a: "one", b: "one" });
    expect(result.score).toBe(50);
    expect(result.isCorrect).toBe(false);
  });
});
