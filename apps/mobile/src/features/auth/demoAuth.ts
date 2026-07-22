import AsyncStorage from "@react-native-async-storage/async-storage";
import { userSettingsResponseSchema, type UserSettingsResponse } from "@deutschtrainer/validation";
import { mobileEnv } from "../../lib/env";

const DEMO_AUTH_STORAGE_KEY = "deutschtrainer:demo-auth:v1";

export const DEMO_AUTH_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_PROFILE_ID = "00000000-0000-4000-8000-000000000002";

export const demoAuthEnabled = mobileEnv.contentSource === "mock";

export const demoUserSettings: UserSettingsResponse = userSettingsResponseSchema.parse({
  profile: {
    id: DEMO_PROFILE_ID,
    authUserId: DEMO_AUTH_USER_ID,
    displayName: "Demo 學習者",
    role: "learner",
    timezone: "Asia/Taipei",
    onboardingCompleted: true,
  },
  learning: {
    currentLevel: "B1",
    targetLevel: "C1",
    dailyMinutes: 20,
    learningGoals: ["daily_life"],
  },
  notifications: {
    notificationsEnabled: false,
    dailyReminderEnabled: false,
    dailyReminderTime: "20:00",
    reviewReminderEnabled: false,
    inactivityReminderEnabled: false,
    inactivityDays: 3,
    writingCompleteEnabled: false,
    newCourseEnabled: false,
    goalCompleteEnabled: false,
    timezone: "Asia/Taipei",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
});

export async function isDemoAuthActive(): Promise<boolean> {
  if (!demoAuthEnabled) {
    return false;
  }

  try {
    return (await AsyncStorage.getItem(DEMO_AUTH_STORAGE_KEY)) === "active";
  } catch {
    return false;
  }
}

export async function persistDemoAuthActive(active: boolean): Promise<void> {
  if (!demoAuthEnabled) {
    throw new Error("此版本未開放離線 Demo。");
  }

  if (active) {
    await AsyncStorage.setItem(DEMO_AUTH_STORAGE_KEY, "active");
    return;
  }

  await AsyncStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
}
