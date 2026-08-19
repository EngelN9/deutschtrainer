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
    const service = createService(repository);

    await expect(service.getSettings("access-token")).resolves.toEqual(settings);
    expect(repository.getSettings).toHaveBeenCalledWith(profileId);
  });

  it("completes onboarding through the owner-scoped repository", async () => {
    const repository = createRepository();
    const service = createService(repository);
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
    const service = createService(repository);
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

  it("reports rolling platform quota without exposing a provider credential", async () => {
    const repository = createRepository();
    repository.listAiQuotaUsage.mockResolvedValue([
      { feature: "evaluate_response", reservedAt: "2026-07-15T08:00:00.000Z" },
    ]);
    const service = createService(repository);

    await expect(service.getAiEntitlement("access-token")).resolves.toEqual({
      providerAvailable: true,
      source: "platform_free",
      windowHours: 24,
      quotas: {
        responseEvaluation: {
          limit: 5,
          used: 1,
          remaining: 4,
          resetsAt: "2026-07-16T08:00:00.000Z",
        },
        writingEvaluation: { limit: 2, used: 0, remaining: 2, resetsAt: null },
        textToSpeech: { limit: 5, used: 0, remaining: 5, resetsAt: null },
        transcription: { limit: 2, used: 0, remaining: 2, resetsAt: null },
        conversation: { limit: 1, used: 0, remaining: 1, resetsAt: null },
      },
    });
  });
});

function createService(repository: SettingsRepository) {
  return new SettingsService({
    repository,
    now: () => new Date("2026-07-15T09:00:00.000Z"),
    aiEntitlement: {
      accessMode: "verified_learners",
      providerConfigured: true,
      publicEnabled: true,
      quotas: {
        evaluate_response: 5,
        evaluate_writing: 2,
        text_to_speech: 5,
        transcribe_audio: 2,
        conversation: 1,
      },
      testProfileIds: [],
    },
  });
}

function createRepository(): jest.Mocked<SettingsRepository> {
  return {
    authenticate: jest.fn(async () => ({
      authUserId: "00000000-0000-4000-8000-000000000002",
      emailVerified: true,
      profileId,
      role: "learner",
    })),
    getSettings: jest.fn(async () => settings),
    listAiQuotaUsage: jest.fn(async () => []),
    completeOnboarding: jest.fn(async () => undefined),
    updateNotificationPreferences: jest.fn(async () => undefined),
  };
}
