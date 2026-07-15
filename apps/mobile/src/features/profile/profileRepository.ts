import type { UserProfile } from "@deutschtrainer/shared-types";
import type { UserSettingsResponse } from "@deutschtrainer/validation";
import { getUserSettings } from "../settings/settingsRepository";

export function fetchCurrentSettings(): Promise<UserSettingsResponse> {
  return getUserSettings();
}

export async function fetchCurrentProfile(): Promise<UserProfile> {
  return (await fetchCurrentSettings()).profile;
}
