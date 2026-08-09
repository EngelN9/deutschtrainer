import type {
  AccountDataExportResponse,
  AccountDeletionResponse,
} from "@deutschtrainer/validation";

export interface AuthenticatedAccount {
  authUserId: string;
  profileId: string;
  email?: string;
  deletionStarted: boolean;
}

export interface AccountStorageObject {
  bucket: "speaking-audio";
  path: string;
}

export interface AccountDataRepository {
  authenticate(
    accessToken: string,
    options?: { includeDeleting?: boolean },
  ): Promise<AuthenticatedAccount | undefined>;
  exportAccount(
    account: AuthenticatedAccount,
  ): Promise<Omit<AccountDataExportResponse, "requestId">>;
  beginDeletion(authUserId: string): Promise<AccountStorageObject[]>;
  deleteStorageObjects(objects: AccountStorageObject[]): Promise<void>;
  deleteAuthUser(authUserId: string): Promise<void>;
}

export interface AccountDataServiceContract {
  exportAccount(accessToken: string): Promise<Omit<AccountDataExportResponse, "requestId">>;
  deleteAccount(accessToken: string): Promise<Omit<AccountDeletionResponse, "requestId">>;
}
