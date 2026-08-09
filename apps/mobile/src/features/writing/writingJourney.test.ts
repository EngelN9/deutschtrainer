import type { WritingFeedback } from "@deutschtrainer/ai-schemas";
import { describe, expect, it } from "@jest/globals";
import { getTopWritingIssues, getWritingImprovementSummary } from "./writingJourney";

describe("writing journey summaries", () => {
  it("places the highest-impact feedback first while preserving provider order within severity", () => {
    const feedback = createFeedback(60, [
      createIssue("spelling", "minor", 0),
      createIssue("word_order", "major", 4),
      createIssue("case", "critical", 8),
      createIssue("article", "major", 12),
    ]);

    expect(getTopWritingIssues(feedback).map((issue) => issue.type)).toEqual([
      "case",
      "word_order",
      "article",
    ]);
  });

  it("summarizes score change, resolved categories, and current priority categories", () => {
    const previous = createFeedback(62, [
      createIssue("word_order", "major", 0),
      createIssue("case", "major", 4),
      createIssue("spelling", "minor", 8),
    ]);
    const current = createFeedback(81, [
      createIssue("case", "moderate", 0),
      createIssue("punctuation", "minor", 4),
      createIssue("case", "minor", 8),
    ]);

    expect(getWritingImprovementSummary(previous, current)).toEqual({
      remainingErrorTypes: ["case", "punctuation"],
      resolvedErrorTypes: ["word_order", "spelling"],
      scoreDelta: 19,
    });
  });
});

function createFeedback(
  score: number,
  inlineErrors: WritingFeedback["inlineErrors"],
): WritingFeedback {
  return {
    cefrLevelEstimate: "B1",
    inlineErrors,
    referenceVersion: null,
    repeatedErrorTypes: [],
    requiresHumanReview: false,
    revisionTasks: ["修正最重要的錯誤。"],
    rubricScores: {
      accuracy: score,
      argumentation: score,
      coherence: score,
      cohesion: score,
      grammar: score,
      idiomaticity: score,
      register: score,
      style: score,
      taskCompletion: score,
      vocabulary: score,
    },
    score,
    strengths: [],
  };
}

function createIssue(
  type: WritingFeedback["inlineErrors"][number]["type"],
  severity: WritingFeedback["inlineErrors"][number]["severity"],
  startOffset: number,
): WritingFeedback["inlineErrors"][number] {
  return {
    correction: "Korrektur",
    endOffset: startOffset + 3,
    explanationZhTw: "說明",
    grammarTopicId: null,
    original: "Feh",
    relatedSkillId: "B1.writing.formal_email",
    severity,
    startOffset,
    type,
    vocabularyId: null,
  };
}
