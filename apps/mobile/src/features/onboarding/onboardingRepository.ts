import type { OnboardingRequest } from "@deutschtrainer/validation";
import { onboardingRequestSchema } from "@deutschtrainer/validation";
import { supabase } from "../../lib/supabase";
import { fetchCurrentProfile } from "../profile/profileRepository";

export async function completeOnboarding(input: OnboardingRequest): Promise<void> {
  const parsed = onboardingRequestSchema.parse(input);
  const profile = await fetchCurrentProfile();

  const preferencesResult = await supabase.from("user_preferences").upsert(
    {
      daily_minutes: parsed.dailyMinutes,
      learning_goals_json: parsed.learningGoals,
      notifications_enabled: parsed.notificationsEnabled,
      target_level: parsed.targetLevel,
      theme: "system",
      user_id: profile.id,
    },
    { onConflict: "user_id" },
  );

  if (preferencesResult.error) {
    throw new Error(preferencesResult.error.message);
  }

  const levelsResult = await supabase.from("user_levels").upsert(
    {
      current_level: parsed.currentLevel,
      placement_status: "not_started",
      target_level: parsed.targetLevel,
      user_id: profile.id,
    },
    { onConflict: "user_id" },
  );

  if (levelsResult.error) {
    throw new Error(levelsResult.error.message);
  }

  const profileResult = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", profile.id);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
}
