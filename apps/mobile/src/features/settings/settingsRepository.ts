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
import { requestApi } from "../../lib/apiClient";

export function getUserSettings(): Promise<UserSettingsResponse> {
  return requestApi("/users/me/settings", userSettingsResponseSchema, {
    authenticated: true,
    fallbackMessage: "個人設定格式不正確。",
  });
}

export function completeOnboarding(input: OnboardingRequest): Promise<UserSettingsResponse> {
  const request = onboardingRequestSchema.parse(input);
  return requestApi("/users/me/onboarding", userSettingsResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "無法儲存初次設定。",
    method: "PUT",
  });
}

export function updateNotificationPreferences(
  input: UpdateNotificationPreferencesRequest,
): Promise<NotificationPreferencesResponse> {
  const request = updateNotificationPreferencesRequestSchema.parse(input);
  return requestApi("/users/me/notification-preferences", notificationPreferencesResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "無法儲存通知偏好。",
    method: "PUT",
  });
}
