import type { LessonContent } from "@deutschtrainer/shared-types";
import type { WritingPromptData, WritingSubmissionData } from "@deutschtrainer/validation";

export type HomeRecommendation =
  | { kind: "writing_revision"; prompt?: WritingPromptData; submission: WritingSubmissionData }
  | { kind: "writing_prompt"; prompt: WritingPromptData }
  | { kind: "lesson"; lesson: LessonContent }
  | { kind: "empty" };

export type WritingRecommendationState = "ready" | "stale" | "loading" | "offline" | "failed";

interface HomeRecommendationInput {
  authMode: "demo" | "supabase" | null;
  continueLesson?: LessonContent;
  pendingWriting?: WritingSubmissionData;
  pendingWritingPrompt?: WritingPromptData;
  recommendedWritingPrompt?: WritingPromptData;
  writingState: WritingRecommendationState;
}

export function selectHomeRecommendation({
  authMode,
  continueLesson,
  pendingWriting,
  pendingWritingPrompt,
  recommendedWritingPrompt,
  writingState,
}: HomeRecommendationInput): HomeRecommendation {
  const writingIsUsable = writingState === "ready" || writingState === "stale";
  if (authMode === "supabase" && writingIsUsable && pendingWriting) {
    return { kind: "writing_revision", prompt: pendingWritingPrompt, submission: pendingWriting };
  }
  if (authMode === "supabase" && writingIsUsable && recommendedWritingPrompt) {
    return { kind: "writing_prompt", prompt: recommendedWritingPrompt };
  }
  if (continueLesson) {
    return { kind: "lesson", lesson: continueLesson };
  }
  return { kind: "empty" };
}
