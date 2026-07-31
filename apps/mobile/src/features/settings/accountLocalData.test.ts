import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { clearLocalAccountData } from "./accountLocalData";
import { clearNotificationProfileData } from "../notifications/NotificationCoordinator";
import { clearAccountNotifications } from "../notifications/notificationRuntime";
import { useOfflineStore } from "../offline/useOfflineStore";
import { useProgressStore } from "../progress/useProgressStore";
import { clearCachedUserSettings } from "./settingsCache";

jest.mock("../notifications/NotificationCoordinator", () => ({
  clearNotificationProfileData: jest.fn(async () => undefined),
}));
jest.mock("../notifications/notificationRuntime", () => ({
  clearAccountNotifications: jest.fn(async () => undefined),
}));
jest.mock("../offline/useOfflineStore", () => ({
  useOfflineStore: {
    getState: jest.fn(),
  },
}));
jest.mock("../progress/useProgressStore", () => ({
  useProgressStore: {
    getState: jest.fn(),
  },
}));
jest.mock("./settingsCache", () => ({
  clearCachedUserSettings: jest.fn(async () => undefined),
}));

const clearOfflineProfile = jest.fn(async () => undefined);
const clearProgressUser = jest.fn(async () => undefined);

describe("clearLocalAccountData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOfflineStore.getState).mockReturnValue({
      profiles: {},
      hasHydrated: true,
      syncStatus: "idle",
      hydrate: jest.fn(async () => undefined),
      downloadCourse: jest.fn(async () => undefined),
      removeCourse: jest.fn(async () => undefined),
      enqueueAttempt: jest.fn(async () => undefined),
      retryAttempt: jest.fn(async () => undefined),
      discardAttempt: jest.fn(async () => undefined),
      clearProfile: clearOfflineProfile,
      syncPendingAttempts: jest.fn(async () => ({
        adjustedCount: 0,
        completedAt: "2026-07-29T00:00:00.000Z",
        conflictCount: 0,
        failedCount: 0,
        syncedCount: 0,
      })),
    });
    jest.mocked(useProgressStore.getState).mockReturnValue({
      byUserId: {},
      hasHydrated: true,
      recordAttempt: jest.fn(async () => undefined),
      resetLesson: jest.fn(async () => undefined),
      clearUser: clearProgressUser,
      setHasHydrated: jest.fn(),
    });
  });

  it("clears every owner-scoped cache and notification source", async () => {
    await clearLocalAccountData({
      authUserId: "auth-user-1",
      profileId: "profile-1",
    });

    expect(clearAccountNotifications).toHaveBeenCalledWith("profile-1");
    expect(clearCachedUserSettings).toHaveBeenCalledWith("auth-user-1");
    expect(clearNotificationProfileData).toHaveBeenCalledWith("profile-1");
    expect(clearOfflineProfile).toHaveBeenCalledWith("profile-1");
    expect(clearProgressUser).toHaveBeenCalledWith("profile-1");
  });
});
