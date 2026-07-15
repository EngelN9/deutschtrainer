import { describe, expect, it, jest } from "@jest/globals";
import type {
  OnboardingRequest,
  UpdateNotificationPreferencesRequest,
  UserSettingsResponse,
} from "@deutschtrainer/validation";
import { SettingsService } from "./settingsService";
import type { SettingsRepository } from "./types";

const profileId = "00000000-0000-4000-8000-000000000001";

const settings: UserSettingsResponse = {
  profile: {
    id: profileId,
    authUserId: "00000000-0000-4000-8000-000000000002",
    displayName: "Learner",
    role: "learner",
    timezone: "Asia/Taipei",
    onboardingCompleted: true,
  },
  learning: {
    currentLevel: "B1",
    targetLevel: "B2",
    dailyMinutes: 20,
    learningGoals: ["work"],
  },
  notifications: {
    notificationsEnabled: true,
    dailyReminderEnabled: true,
    dailyReminderTime: "20:00",
    reviewReminderEnabled: true,
    inactivityReminderEnabled: true,
    inactivityDays: 3,
    writingCompleteEnabled: true,
    newCourseEnabled: true,
    goalCompleteEnabled: true,
    timezone: "Asia/Taipei",
    updatedAt: "2026-07-15T08:00:00.000Z",
  },
};

describe("SettingsService", () => {
  it("loads settings only for the authenticated owner", async () => {
    const repository = createRepository();
    const service = new SettingsService({ repository });

    await expect(service.getSettings("access-token")).resolves.toEqual(settings);
    expect(repository.getSettings).toHaveBeenCalledWith(profileId);
  });

  it("completes onboarding through the owner-scoped repository", async () => {
    const repository = createRepository();
    const service = new SettingsService({ repository });
    const request: OnboardingRequest = {
      currentLevel: "B1",
      targetLevel: "B2",
      dailyMinutes: 30,
      learningGoals: ["work"],
      notificationsEnabled: true,
    };

    await expect(service.completeOnboarding("access-token", request)).resolves.toEqual(settings);
    expect(repository.completeOnboarding).toHaveBeenCalledWith(profileId, request);
  });

  it("updates notification preferences and returns the persisted server value", async () => {
    const repository = createRepository();
    const service = new SettingsService({ repository });
    const request: UpdateNotificationPreferencesRequest = {
      notificationsEnabled: false,
      dailyReminderEnabled: true,
      dailyReminderTime: "21:30",
      reviewReminderEnabled: true,
      inactivityReminderEnabled: false,
      inactivityDays: 7,
      writingCompleteEnabled: true,
      newCourseEnabled: false,
      goalCompleteEnabled: true,
      timezone: "Europe/Berlin",
    };

    await expect(service.updateNotificationPreferences("access-token", request)).resolves.toEqual({
      notifications: settings.notifications,
    });
    expect(repository.updateNotificationPreferences).toHaveBeenCalledWith(profileId, request);
  });
});

function createRepository(): jest.Mocked<SettingsRepository> {
  return {
    authenticate: jest.fn(async () => ({
      authUserId: "00000000-0000-4000-8000-000000000002",
      profileId,
    })),
    getSettings: jest.fn(async () => settings),
    completeOnboarding: jest.fn(async () => undefined),
    updateNotificationPreferences: jest.fn(async () => undefined),
  };
}
