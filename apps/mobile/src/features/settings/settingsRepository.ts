import {
  notificationPreferencesResponseSchema,
  onboardingRequestSchema,
  updateNotificationPreferencesRequestSchema,
  userSettingsResponseSchema,
  type NotificationPreferencesResponse,
  type OnboardingRequest,
  type UpdateNotificationPreferencesRequest,
  type UserSettingsResponse,
} from "@deutschtrainer/validation";
import { isNetworkApiError, requestApi } from "../../lib/apiClient";
import { mobileEnv } from "../../lib/env";
import { DEMO_AUTH_USER_ID, demoUserSettings } from "../auth/demoAuth";
import { readCachedUserSettings, writeCachedUserSettings } from "./settingsCache";

export async function getUserSettings(authUserId?: string): Promise<UserSettingsResponse> {
  if (isDemoUser(authUserId)) {
    return (await readCachedUserSettings(DEMO_AUTH_USER_ID)) ?? demoUserSettings;
  }

  try {
    const settings = await requestApi("/users/me/settings", userSettingsResponseSchema, {
      authenticated: true,
      fallbackMessage: "個人設定格式不正確。",
    });
    if (authUserId) {
      await writeCachedUserSettings(authUserId, settings).catch(() => undefined);
    }
    return settings;
  } catch (error) {
    if (authUserId && isNetworkApiError(error)) {
      const cached = await readCachedUserSettings(authUserId);
      if (cached) {
        return cached;
      }
    }
    throw error;
  }
}

export async function completeOnboarding(
  input: OnboardingRequest,
  authUserId?: string,
): Promise<UserSettingsResponse> {
  const request = onboardingRequestSchema.parse(input);
  if (isDemoUser(authUserId)) {
    const current = await getUserSettings(DEMO_AUTH_USER_ID);
    const settings = userSettingsResponseSchema.parse({
      ...current,
      profile: { ...current.profile, onboardingCompleted: true },
      learning: {
        currentLevel: request.currentLevel,
        targetLevel: request.targetLevel,
        dailyMinutes: request.dailyMinutes,
        learningGoals: request.learningGoals,
      },
      notifications: {
        ...current.notifications,
        notificationsEnabled: request.notificationsEnabled,
        updatedAt: new Date().toISOString(),
      },
    });
    await writeCachedUserSettings(DEMO_AUTH_USER_ID, settings);
    return settings;
  }

  const settings = await requestApi("/users/me/onboarding", userSettingsResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "無法儲存初次設定。",
    method: "PUT",
  });
  if (authUserId) {
    await writeCachedUserSettings(authUserId, settings).catch(() => undefined);
  }
  return settings;
}

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesRequest,
  authUserId?: string,
): Promise<NotificationPreferencesResponse> {
  const request = updateNotificationPreferencesRequestSchema.parse(input);
  if (isDemoUser(authUserId)) {
    const current = await getUserSettings(DEMO_AUTH_USER_ID);
    const notifications = notificationPreferencesResponseSchema.parse({
      notifications: { ...request, updatedAt: new Date().toISOString() },
    });
    await writeCachedUserSettings(DEMO_AUTH_USER_ID, {
      ...current,
      profile: { ...current.profile, timezone: notifications.notifications.timezone },
      notifications: notifications.notifications,
    });
    return notifications;
  }

  const response = await requestApi(
    "/users/me/notification-preferences",
    notificationPreferencesResponseSchema,
    {
      authenticated: true,
      body: request,
      fallbackMessage: "無法儲存通知偏好。",
      method: "PUT",
    },
  );
  if (authUserId) {
    const cached = await readCachedUserSettings(authUserId);
    if (cached) {
      await writeCachedUserSettings(authUserId, {
        ...cached,
        profile: { ...cached.profile, timezone: response.notifications.timezone },
        notifications: response.notifications,
      }).catch(() => undefined);
    }
  }
  return response;
}

function isDemoUser(authUserId?: string): boolean {
  return mobileEnv.contentSource === "mock" && authUserId === DEMO_AUTH_USER_ID;
}
