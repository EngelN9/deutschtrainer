import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDataExportResponseSchema,
  accountDeletionRequestSchema,
  accountDeletionResponseSchema,
  type AccountDataExportResponse,
} from "@deutschtrainer/validation";
import { requestApi } from "../../lib/apiClient";

export async function exportAccountData(): Promise<AccountDataExportResponse> {
  return requestApi("/users/me/export", accountDataExportResponseSchema, {
    authenticated: true,
    fallbackMessage: "帳號資料匯出格式不正確。",
  });
}

export async function deleteRemoteAccount(confirmation: string): Promise<void> {
  const request = accountDeletionRequestSchema.parse({ confirmation });
  await requestApi("/users/me", accountDeletionResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "無法完成帳號刪除。",
    method: "DELETE",
  });
}

export { ACCOUNT_DELETION_CONFIRMATION };
