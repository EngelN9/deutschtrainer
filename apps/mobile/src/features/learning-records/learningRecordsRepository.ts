import type { Attempt, LearningRecordSnapshot } from "@deutschtrainer/shared-types";
import {
  completeReviewResponseSchema,
  learningRecordSnapshotSchema,
  progressResponseSchema,
  submitAttemptResponseSchema,
  type CompleteReviewResponse,
  type SubmitAttemptResponse,
} from "@deutschtrainer/validation";
import { requestApi } from "../../lib/apiClient";

export interface SubmitRemoteAttemptInput {
  exerciseId: string;
  answer: unknown;
  durationMs: number;
  usedHint: boolean;
  mode: Exclude<Attempt["mode"], "review">;
  idempotencyKey: string;
}

export async function submitRemoteAttempt(
  input: SubmitRemoteAttemptInput,
): Promise<SubmitAttemptResponse> {
  return requestApi("/attempts", submitAttemptResponseSchema, {
    authenticated: true,
    body: input,
    fallbackMessage: "學習服務回傳的作答結果不完整。",
    method: "POST",
  });
}

export async function completeRemoteReview(
  reviewId: string,
  input: Omit<SubmitRemoteAttemptInput, "exerciseId" | "mode">,
): Promise<CompleteReviewResponse> {
  return requestApi(
    `/reviews/${encodeURIComponent(reviewId)}/complete`,
    completeReviewResponseSchema,
    {
      authenticated: true,
      body: input,
      fallbackMessage: "學習服務回傳的複習結果不完整。",
      method: "POST",
    },
  );
}

export async function getRemoteLearningRecords(): Promise<LearningRecordSnapshot> {
  const response = await requestApi("/users/me/progress", progressResponseSchema, {
    authenticated: true,
    fallbackMessage: "學習服務回傳的進度格式不完整。",
  });
  const { generatedAt: _generatedAt, ...snapshot } = response;
  return learningRecordSnapshotSchema.parse(snapshot) as LearningRecordSnapshot;
}
