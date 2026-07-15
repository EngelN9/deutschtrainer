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
import { readCachedUserSettings, writeCachedUserSettings } from "./settingsCache";

export async function getUserSettings(authUserId?: string): Promise<UserSettingsResponse> {
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
