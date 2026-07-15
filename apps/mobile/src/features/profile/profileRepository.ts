import type { UserProfile } from "@deutschtrainer/shared-types";
import type { UserSettingsResponse } from "@deutschtrainer/validation";
import { getUserSettings } from "../settings/settingsRepository";

export function fetchCurrentSettings(authUserId?: string): Promise<UserSettingsResponse> {
  return getUserSettings(authUserId);
}

export async function fetchCurrentProfile(authUserId?: string): Promise<UserProfile> {
  return (await fetchCurrentSettings(authUserId)).profile;
}
