import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CefrLevel, UserProfile } from "@deutschtrainer/shared-types";
import {
  learningGoalSchema,
  userSettingsResponseSchema,
  type OnboardingRequest,
  type UpdateNotificationPreferencesRequest,
  type UserSettingsResponse,
} from "@deutschtrainer/validation";
import { z } from "zod";
import { ApiError } from "../errors";
import type { AuthenticatedSettingsUser, SettingsRepository } from "./types";

interface ProfileRow {
  id: string;
  auth_user_id: string;
  display_name: string;
  role: UserProfile["role"];
  timezone: string;
  onboarding_completed: boolean;
  updated_at: string;
}

interface PreferenceRow {
  daily_minutes: number;
  target_level: CefrLevel;
  learning_goals_json: unknown;
  notifications_enabled: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  review_reminder_enabled: boolean;
  inactivity_reminder_enabled: boolean;
  inactivity_days: number;
  writing_complete_enabled: boolean;
  new_course_enabled: boolean;
  goal_complete_enabled: boolean;
  updated_at: string;
}

interface UserLevelRow {
  current_level: CefrLevel;
  target_level: CefrLevel;
}

const learningGoalsSchema = z.array(learningGoalSchema).max(5);

export class SupabaseSettingsRepository implements SettingsRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedSettingsUser | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      return undefined;
    }
    const profileResult = await this.client
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userResult.data.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(profileResult.error, "無法驗證學習者資料。");
    if (!profileResult.data) {
      return undefined;
    }
    return { authUserId: userResult.data.user.id, profileId: profileResult.data.id };
  }

  async getSettings(profileId: string): Promise<UserSettingsResponse> {
    const [profileResult, preferencesResult, levelResult] = await Promise.all([
      this.client
        .from("profiles")
        .select("id, auth_user_id, display_name, role, timezone, onboarding_completed, updated_at")
        .eq("id", profileId)
        .is("deleted_at", null)
        .maybeSingle(),
      this.client
        .from("user_preferences")
        .select(
          "daily_minutes, target_level, learning_goals_json, notifications_enabled, daily_reminder_enabled, daily_reminder_time, review_reminder_enabled, inactivity_reminder_enabled, inactivity_days, writing_complete_enabled, new_course_enabled, goal_complete_enabled, updated_at",
        )
        .eq("user_id", profileId)
        .maybeSingle(),
      this.client
        .from("user_levels")
        .select("current_level, target_level")
        .eq("user_id", profileId)
        .maybeSingle(),
    ]);
    assertDatabaseResult(profileResult.error, "無法載入個人資料。");
    assertDatabaseResult(preferencesResult.error, "無法載入通知偏好。");
    assertDatabaseResult(levelResult.error, "無法載入程度設定。");
    if (!profileResult.data) {
      throw new ApiError("NOT_FOUND", "找不到使用者設定。", 404, false);
    }

    const profile = profileResult.data as ProfileRow;
    const preferences = preferencesResult.data as PreferenceRow | null;
    const level = levelResult.data as UserLevelRow | null;
    const learningGoals = learningGoalsSchema.safeParse(preferences?.learning_goals_json);

    return userSettingsResponseSchema.parse({
      profile: {
        id: profile.id,
        authUserId: profile.auth_user_id,
        displayName: profile.display_name,
        role: profile.role,
        timezone: profile.timezone,
        onboardingCompleted: profile.onboarding_completed,
      },
      learning: {
        currentLevel: level?.current_level ?? "B1",
        targetLevel: level?.target_level ?? preferences?.target_level ?? "B2",
        dailyMinutes: preferences?.daily_minutes ?? 20,
        learningGoals: learningGoals.success ? learningGoals.data : [],
      },
      notifications: {
        notificationsEnabled: preferences?.notifications_enabled ?? true,
        dailyReminderEnabled: preferences?.daily_reminder_enabled ?? true,
        dailyReminderTime: normalizeTime(preferences?.daily_reminder_time ?? "20:00"),
        reviewReminderEnabled: preferences?.review_reminder_enabled ?? true,
        inactivityReminderEnabled: preferences?.inactivity_reminder_enabled ?? true,
        inactivityDays: preferences?.inactivity_days ?? 3,
        writingCompleteEnabled: preferences?.writing_complete_enabled ?? true,
        newCourseEnabled: preferences?.new_course_enabled ?? true,
        goalCompleteEnabled: preferences?.goal_complete_enabled ?? true,
        timezone: profile.timezone,
        updatedAt: preferences?.updated_at ?? profile.updated_at,
      },
    });
  }

  async completeOnboarding(profileId: string, request: OnboardingRequest): Promise<void> {
    const result = await this.client.rpc("complete_onboarding_service", {
      p_user_id: profileId,
      p_current_level: request.currentLevel,
      p_target_level: request.targetLevel,
      p_daily_minutes: request.dailyMinutes,
      p_learning_goals: request.learningGoals,
      p_notifications_enabled: request.notificationsEnabled,
    });
    assertMutationResult(result.error, "無法儲存初次設定。");
  }

  async updateNotificationPreferences(
    profileId: string,
    request: UpdateNotificationPreferencesRequest,
  ): Promise<void> {
    const result = await this.client.rpc("update_notification_preferences_service", {
      p_user_id: profileId,
      p_notifications_enabled: request.notificationsEnabled,
      p_daily_reminder_enabled: request.dailyReminderEnabled,
      p_daily_reminder_time: request.dailyReminderTime,
      p_review_reminder_enabled: request.reviewReminderEnabled,
      p_inactivity_reminder_enabled: request.inactivityReminderEnabled,
      p_inactivity_days: request.inactivityDays,
      p_writing_complete_enabled: request.writingCompleteEnabled,
      p_new_course_enabled: request.newCourseEnabled,
      p_goal_complete_enabled: request.goalCompleteEnabled,
      p_timezone: request.timezone,
    });
    assertMutationResult(result.error, "無法儲存通知偏好。");
  }
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function assertDatabaseResult(
  error: { code?: string; message?: string } | null,
  message: string,
): void {
  if (error) {
    throw new ApiError("DATABASE_ERROR", message, 500, true);
  }
}

function assertMutationResult(
  error: { code?: string; message?: string } | null,
  message: string,
): void {
  if (!error) {
    return;
  }
  if (error.code === "22023") {
    throw new ApiError("VALIDATION_ERROR", message, 400, false);
  }
  if (error.code === "42501") {
    throw new ApiError("FORBIDDEN", message, 403, false);
  }
  throw new ApiError("DATABASE_ERROR", message, 500, true);
}
