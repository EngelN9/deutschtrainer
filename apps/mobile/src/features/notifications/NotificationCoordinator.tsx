import { useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../auth/useAuthStore";
import { useCourseCatalog } from "../courses/useCourseCatalog";
import { useLearningRecords } from "../learning-records/useLearningRecords";
import { useUserSettings } from "../settings/useUserSettings";
import { buildReminderPlan, formatDateKey } from "./notificationPlan";
import {
  initializeNotificationRuntime,
  presentLearningNotification,
  syncScheduledReminders,
} from "./notificationRuntime";

const courseSnapshotPrefix = "deutschtrainer:notification-courses:v1:";

export function NotificationCoordinator() {
  const profile = useAuthStore((state) => state.profile);
  const settingsQuery = useUserSettings();
  const recordsQuery = useLearningRecords();
  const catalogQuery = useCourseCatalog();
  const reminderPlan = useMemo(() => {
    const preferences = settingsQuery.data?.notifications;
    if (!profile || !preferences) {
      return [];
    }
    const attempts = recordsQuery.data?.attempts ?? [];
    const lastActivityAt = attempts
      .map((attempt) => attempt.submittedAt)
      .toSorted()
      .at(-1);
    const dueReviewCount =
      recordsQuery.data?.reviews.filter(
        (review) =>
          review.status === "scheduled" && new Date(review.scheduledAt).getTime() <= Date.now(),
      ).length ?? 0;
    return buildReminderPlan(preferences, {
      dueReviewCount,
      ...(lastActivityAt ? { lastActivityAt } : {}),
    });
  }, [profile, recordsQuery.data, settingsQuery.data?.notifications]);

  useEffect(() => {
    initializeNotificationRuntime();
  }, []);

  useEffect(() => {
    if (!profile) {
      void syncScheduledReminders([]).catch(() => undefined);
      return;
    }
    if (settingsQuery.data?.notifications) {
      void syncScheduledReminders(reminderPlan).catch(() => undefined);
    }
  }, [profile, reminderPlan, settingsQuery.data?.notifications]);

  useEffect(() => {
    const settings = settingsQuery.data;
    const catalog = catalogQuery.data;
    if (!profile || !settings || !catalog) {
      return;
    }
    void reconcilePublishedCourses(
      profile.id,
      catalog.courses.map((course) => ({ id: course.id, title: course.titleZhTw })),
      settings.notifications.notificationsEnabled && settings.notifications.newCourseEnabled,
    );
  }, [catalogQuery.data, profile, settingsQuery.data]);

  useEffect(() => {
    const settings = settingsQuery.data;
    const attempts = recordsQuery.data?.attempts;
    if (!profile || !settings || !attempts || attempts.length === 0) {
      return;
    }
    const timezone = settings.notifications.timezone;
    const today = formatDateKey(new Date(), timezone);
    const learningMs = attempts
      .filter((attempt) => formatDateKey(new Date(attempt.submittedAt), timezone) === today)
      .reduce((sum, attempt) => sum + attempt.durationMs, 0);
    if (
      settings.notifications.notificationsEnabled &&
      settings.notifications.goalCompleteEnabled &&
      learningMs >= settings.learning.dailyMinutes * 60 * 1000
    ) {
      void presentLearningNotification({
        title: "今日學習目標完成",
        body: `今天已完成 ${settings.learning.dailyMinutes} 分鐘的德語學習目標。`,
        path: "/home",
        dedupeKey: `goal:${profile.id}:${today}`,
      }).catch(() => undefined);
    }
  }, [profile, recordsQuery.data?.attempts, settingsQuery.data]);

  return null;
}

async function reconcilePublishedCourses(
  profileId: string,
  courses: Array<{ id: string; title: string }>,
  enabled: boolean,
): Promise<void> {
  const storageKey = `${courseSnapshotPrefix}${profileId}`;
  const currentIds = courses.map((course) => course.id).toSorted();
  const previousIds = await readCourseIds(storageKey);
  await AsyncStorage.setItem(storageKey, JSON.stringify(currentIds));
  if (!enabled || previousIds === undefined) {
    return;
  }
  const previous = new Set(previousIds);
  const published = courses.filter((course) => !previous.has(course.id));
  if (published.length === 0) {
    return;
  }
  const first = published[0];
  if (!first) {
    return;
  }
  await presentLearningNotification({
    title: "新課程已發布",
    body:
      published.length === 1
        ? `${first.title} 現在可以開始學習。`
        : `有 ${published.length} 門新課程可以開始學習。`,
    path: "/courses",
    dedupeKey: `courses:${profileId}:${currentIds.join(",")}`,
  });
}

async function readCourseIds(key: string): Promise<string[] | undefined> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) {
      return undefined;
    }
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : undefined;
  } catch {
    return undefined;
  }
}
