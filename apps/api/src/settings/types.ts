import type {
  NotificationPreferencesResponse,
  OnboardingRequest,
  UpdateNotificationPreferencesRequest,
  UserSettingsResponse,
} from "@deutschtrainer/validation";

export interface AuthenticatedSettingsUser {
  authUserId: string;
  profileId: string;
}

export interface SettingsRepository {
  authenticate(accessToken: string): Promise<AuthenticatedSettingsUser | undefined>;
  getSettings(profileId: string): Promise<UserSettingsResponse>;
  completeOnboarding(profileId: string, request: OnboardingRequest): Promise<void>;
  updateNotificationPreferences(
    profileId: string,
    request: UpdateNotificationPreferencesRequest,
  ): Promise<void>;
}

export interface SettingsServiceContract {
  getSettings(accessToken: string): Promise<UserSettingsResponse>;
  completeOnboarding(
    accessToken: string,
    request: OnboardingRequest,
  ): Promise<UserSettingsResponse>;
  updateNotificationPreferences(
    accessToken: string,
    request: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferencesResponse>;
}
