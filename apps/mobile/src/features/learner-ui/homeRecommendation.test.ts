import { describe, expect, it } from "@jest/globals";
import type { LessonContent } from "@deutschtrainer/shared-types";
import type { WritingPromptData, WritingSubmissionData } from "@deutschtrainer/validation";
import { selectHomeRecommendation } from "./homeRecommendation";

const lesson = { id: "lesson-1" } as LessonContent;
const prompt = { id: "prompt-1" } as WritingPromptData;
const submission = { id: "submission-1" } as WritingSubmissionData;

describe("selectHomeRecommendation", () => {
  it("prioritizes a connected learner's pending rewrite", () => {
    expect(
      selectHomeRecommendation({
        authMode: "supabase",
        continueLesson: lesson,
        pendingWriting: submission,
        pendingWritingPrompt: prompt,
        recommendedWritingPrompt: prompt,
        writingState: "ready",
      }),
    ).toMatchObject({ kind: "writing_revision", submission });
  });

  it("recommends a writing prompt before a supporting lesson for connected learners", () => {
    expect(
      selectHomeRecommendation({
        authMode: "supabase",
        continueLesson: lesson,
        recommendedWritingPrompt: prompt,
        writingState: "ready",
      }),
    ).toEqual({ kind: "writing_prompt", prompt });
  });

  it("keeps Demo recommendations on fixed lessons", () => {
    expect(
      selectHomeRecommendation({
        authMode: "demo",
        continueLesson: lesson,
        recommendedWritingPrompt: prompt,
        writingState: "ready",
      }),
    ).toEqual({ kind: "lesson", lesson });
  });

  it("returns an explicit empty state when no activity is available", () => {
    expect(selectHomeRecommendation({ authMode: "supabase", writingState: "ready" })).toEqual({
      kind: "empty",
    });
  });

  it.each(["offline", "failed", "loading"] as const)(
    "falls back to a fixed lesson when writing is %s",
    (writingState) => {
      expect(
        selectHomeRecommendation({
          authMode: "supabase",
          continueLesson: lesson,
          pendingWriting: submission,
          recommendedWritingPrompt: prompt,
          writingState,
        }),
      ).toEqual({ kind: "lesson", lesson });
    },
  );

  it("may use cached writing data while it is stale but the learner is online", () => {
    expect(
      selectHomeRecommendation({
        authMode: "supabase",
        pendingWriting: submission,
        pendingWritingPrompt: prompt,
        writingState: "stale",
      }),
    ).toEqual({ kind: "writing_revision", prompt, submission });
  });

  it("uses the same data-backed policy for a connected guest session", () => {
    expect(
      selectHomeRecommendation({
        authMode: "supabase",
        continueLesson: lesson,
        recommendedWritingPrompt: prompt,
        writingState: "ready",
      }),
    ).toEqual({ kind: "writing_prompt", prompt });
  });
});
