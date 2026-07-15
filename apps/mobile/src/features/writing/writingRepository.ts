import {
  deleteWritingSubmissionResponseSchema,
  evaluateWritingResponseSchema,
  writingWorkspaceResponseSchema,
  type EvaluateWritingRequest,
  type EvaluateWritingResponse,
  type WritingWorkspace,
} from "@deutschtrainer/validation";
import { requestApi } from "../../lib/apiClient";

export async function getWritingWorkspace(): Promise<WritingWorkspace> {
  return requestApi("/users/me/writing", writingWorkspaceResponseSchema, {
    authenticated: true,
    fallbackMessage: "作文資料格式不完整，請稍後重新整理。",
  });
}

export async function submitWriting(
  request: EvaluateWritingRequest,
): Promise<EvaluateWritingResponse> {
  return requestApi("/ai/evaluate-writing", evaluateWritingResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "作文批改回傳格式不完整，請稍後重試。",
    method: "POST",
  });
}

export async function deleteWritingSubmission(submissionId: string): Promise<void> {
  await requestApi(
    `/writing/submissions/${encodeURIComponent(submissionId)}`,
    deleteWritingSubmissionResponseSchema,
    {
      authenticated: true,
      fallbackMessage: "無法刪除作文與版本紀錄。",
      method: "DELETE",
    },
  );
}
