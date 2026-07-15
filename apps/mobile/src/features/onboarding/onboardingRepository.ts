import type { OnboardingRequest, UserSettingsResponse } from "@deutschtrainer/validation";
import { completeOnboarding as completeOnboardingThroughApi } from "../settings/settingsRepository";

export function completeOnboarding(
  input: OnboardingRequest,
  authUserId?: string,
): Promise<UserSettingsResponse> {
  return completeOnboardingThroughApi(input, authUserId);
}
