import type { OnboardingRequest, UserSettingsResponse } from "@deutschtrainer/validation";
import { completeOnboarding as completeOnboardingThroughApi } from "../settings/settingsRepository";

export function completeOnboarding(input: OnboardingRequest): Promise<UserSettingsResponse> {
  return completeOnboardingThroughApi(input);
}
