import type {
  AiEntitlementResponse,
  NotificationPreferencesResponse,
  OnboardingRequest,
  UpdateNotificationPreferencesRequest,
  UserSettingsResponse,
} from "@deutschtrainer/validation";
import type { UserProfile } from "@deutschtrainer/shared-types";
import type { AiQuotaFeature } from "../ai-quota/types";

export interface AuthenticatedSettingsUser {
  authUserId: string;
  emailVerified: boolean;
  profileId: string;
  role: UserProfile["role"];
}

export interface AiQuotaUsageRow {
  feature: AiQuotaFeature;
  reservedAt: string;
}

export interface SettingsRepository {
  authenticate(accessToken: string): Promise<AuthenticatedSettingsUser | undefined>;
  getSettings(profileId: string): Promise<UserSettingsResponse>;
  listAiQuotaUsage(profileId: string, since: string): Promise<AiQuotaUsageRow[]>;
  completeOnboarding(profileId: string, request: OnboardingRequest): Promise<void>;
  updateNotificationPreferences(
    profileId: string,
    request: UpdateNotificationPreferencesRequest,
  ): Promise<void>;
}

export interface SettingsServiceContract {
  getSettings(accessToken: string): Promise<UserSettingsResponse>;
  getAiEntitlement(accessToken: string): Promise<AiEntitlementResponse>;
  completeOnboarding(
    accessToken: string,
    request: OnboardingRequest,
  ): Promise<UserSettingsResponse>;
  updateNotificationPreferences(
    accessToken: string,
    request: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferencesResponse>;
}
