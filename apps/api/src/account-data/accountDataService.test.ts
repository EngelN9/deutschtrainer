import { describe, expect, it, jest } from "@jest/globals";
import { ApiError } from "../errors";
import { AccountDataService } from "./accountDataService";
import type { AccountDataRepository, AuthenticatedAccount } from "./types";

const account: AuthenticatedAccount = {
  authUserId: "auth-user-1",
  profileId: "profile-1",
  email: "learner@example.invalid",
  deletionStarted: false,
};

describe("AccountDataService", () => {
  it("exports only after authenticating an active account", async () => {
    const repository = createRepository();
    const service = new AccountDataService({ repository });

    await service.exportAccount("access-token");

    expect(repository.authenticate).toHaveBeenCalledWith("access-token", {
      includeDeleting: false,
    });
    expect(repository.exportAccount).toHaveBeenCalledWith(account);
  });

  it("deletes Storage before deleting the Auth user", async () => {
    const callOrder: string[] = [];
    const repository = createRepository({
      beginDeletion: jest.fn(async () => {
        callOrder.push("begin");
        return [{ bucket: "speaking-audio" as const, path: "auth-user-1/recording.webm" }];
      }),
      deleteStorageObjects: jest.fn(async () => {
        callOrder.push("storage");
      }),
      deleteAuthUser: jest.fn(async () => {
        callOrder.push("auth");
      }),
    });
    const service = new AccountDataService({ repository });

    await expect(service.deleteAccount("access-token")).resolves.toEqual({ deleted: true });
    expect(repository.authenticate).toHaveBeenCalledWith("access-token", {
      includeDeleting: true,
    });
    expect(callOrder).toEqual(["begin", "storage", "auth"]);
  });

  it("does not delete the Auth user if Storage cleanup fails", async () => {
    const repository = createRepository({
      beginDeletion: jest.fn(async () => [
        { bucket: "speaking-audio" as const, path: "auth-user-1/recording.webm" },
      ]),
      deleteStorageObjects: jest.fn(async () => {
        throw new ApiError("DATABASE_ERROR", "storage failed", 500, true);
      }),
    });
    const service = new AccountDataService({ repository });

    await expect(service.deleteAccount("access-token")).rejects.toMatchObject({
      code: "DATABASE_ERROR",
      retryable: true,
    });
    expect(repository.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("can retry after Storage cleanup fails", async () => {
    let storageAttempts = 0;
    const repository = createRepository({
      beginDeletion: jest.fn(async () => [
        { bucket: "speaking-audio" as const, path: "auth-user-1/recording.webm" },
      ]),
      deleteStorageObjects: jest.fn(async () => {
        storageAttempts += 1;
        if (storageAttempts === 1) {
          throw new ApiError("DATABASE_ERROR", "storage failed", 500, true);
        }
      }),
    });
    const service = new AccountDataService({ repository });

    await expect(service.deleteAccount("access-token")).rejects.toMatchObject({
      retryable: true,
    });
    await expect(service.deleteAccount("access-token")).resolves.toEqual({ deleted: true });
    expect(repository.beginDeletion).toHaveBeenCalledTimes(2);
    expect(repository.deleteStorageObjects).toHaveBeenCalledTimes(2);
    expect(repository.deleteAuthUser).toHaveBeenCalledTimes(1);
  });

  it("can replay Storage cleanup when Auth deletion fails", async () => {
    let authAttempts = 0;
    const repository = createRepository({
      beginDeletion: jest.fn(async () => [
        { bucket: "speaking-audio" as const, path: "auth-user-1/recording.webm" },
      ]),
      deleteAuthUser: jest.fn(async () => {
        authAttempts += 1;
        if (authAttempts === 1) {
          throw new ApiError("DATABASE_ERROR", "auth failed", 500, true);
        }
      }),
    });
    const service = new AccountDataService({ repository });

    await expect(service.deleteAccount("access-token")).rejects.toMatchObject({
      retryable: true,
    });
    await expect(service.deleteAccount("access-token")).resolves.toEqual({ deleted: true });
    expect(repository.beginDeletion).toHaveBeenCalledTimes(2);
    expect(repository.deleteStorageObjects).toHaveBeenCalledTimes(2);
    expect(repository.deleteAuthUser).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid session before any deletion side effect", async () => {
    const repository = createRepository({
      authenticate: jest.fn(async () => undefined),
    });
    const service = new AccountDataService({ repository });

    await expect(service.deleteAccount("expired-token")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
    expect(repository.beginDeletion).not.toHaveBeenCalled();
  });
});

function createRepository(
  overrides: Partial<jest.Mocked<AccountDataRepository>> = {},
): jest.Mocked<AccountDataRepository> {
  return {
    authenticate: jest.fn(async () => account),
    exportAccount: jest.fn(async () => ({
      schemaVersion: "1" as const,
      exportedAt: "2026-07-29T00:00:00.000Z",
      profile: { id: account.profileId },
      collections: {
        userPreferences: [],
        userLevels: [],
        attempts: [],
        attemptAnswers: [],
        errorRecords: [],
        skillMastery: [],
        reviewQueue: [],
        lessonProgress: [],
        aiFeedback: [],
        aiUsageLogs: [],
        writingSubmissions: [],
        writingVersions: [],
        listeningAttempts: [],
        speakingSubmissions: [],
        audioAssets: [],
        contentVersions: [],
        contentReviewsRequested: [],
        contentReviewsPerformed: [],
        aiGenerationJobs: [],
        auditLogs: [],
      },
      audioFiles: [],
    })),
    beginDeletion: jest.fn(async () => []),
    deleteStorageObjects: jest.fn(async () => undefined),
    deleteAuthUser: jest.fn(async () => undefined),
    ...overrides,
  };
}
