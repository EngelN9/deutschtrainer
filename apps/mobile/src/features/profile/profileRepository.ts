import type { UserProfile } from "@deutschtrainer/shared-types";
import { supabase } from "../../lib/supabase";

type ProfileRow = {
  auth_user_id: string;
  display_name: string;
  id: string;
  onboarding_completed: boolean;
  role: "learner" | "content_editor" | "reviewer" | "admin";
  timezone: string;
};

export async function fetchCurrentProfile(): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, display_name, role, timezone, onboarding_completed")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("找不到使用者個人資料，請重新登入。");
  }

  return mapProfileRow(data);
}

export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    id: row.id,
    onboardingCompleted: row.onboarding_completed,
    role: row.role,
    timezone: row.timezone,
  };
}
