import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { ReminderPlanItem } from "./notificationPlan";
import type { LearningNotificationEvent, NotificationPermissionState } from "./notificationTypes";

const channelId = "learning-reminders";
const scheduleStorageKey = "deutschtrainer:notification-schedule:v1";
const eventLedgerStorageKey = "deutschtrainer:notification-events:v1";
const eventRetentionMs = 30 * 24 * 60 * 60 * 1000;
let initialized = false;
let scheduleSyncQueue = Promise.resolve<NotificationPermissionState>("undetermined");
let eventPresentationQueue = Promise.resolve(false);

export function initializeNotificationRuntime(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  Notifications.addNotificationResponseReceivedListener((response) => {
    const path = response.notification.request.content.data?.path;
    if (typeof path === "string" && path.startsWith("/")) {
      void Linking.openURL(Linking.createURL(path));
    }
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const status = await Notifications.getPermissionsAsync();
  return toPermissionState(status);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  await ensureChannel();
  const current = await getNotificationPermissionState();
  if (current === "granted") {
    return current;
  }
  const status = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return toPermissionState(status);
}

export function syncScheduledReminders(
  items: ReminderPlanItem[],
): Promise<NotificationPermissionState> {
  const nextItems = items.map((item) => ({ ...item }));
  const task = scheduleSyncQueue
    .catch(() => "undetermined" as const)
    .then(() => replaceScheduledReminders(nextItems));
  scheduleSyncQueue = task;
  return task;
}

async function replaceScheduledReminders(
  items: ReminderPlanItem[],
): Promise<NotificationPermissionState> {
  const previousIdentifiers = await readStringArray(scheduleStorageKey);
  await Promise.all(
    previousIdentifiers.map(async (identifier) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      } catch {
        // The operating system may already have delivered or removed this identifier.
      }
    }),
  );
  await writeJson(scheduleStorageKey, []);

  const permission = await getNotificationPermissionState();
  if (items.length === 0 || permission !== "granted") {
    return permission;
  }

  await ensureChannel();
  const identifiers: string[] = [];
  try {
    for (const item of items) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          data: { path: item.path, reminderKey: item.key },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.fireAt),
          channelId,
        },
      });
      identifiers.push(identifier);
    }
  } finally {
    await writeJson(scheduleStorageKey, identifiers);
  }
  return permission;
}

export function presentLearningNotification(event: LearningNotificationEvent): Promise<boolean> {
  const nextEvent = { ...event };
  const task = eventPresentationQueue
    .catch(() => false)
    .then(() => presentDeduplicatedLearningNotification(nextEvent));
  eventPresentationQueue = task;
  return task;
}

async function presentDeduplicatedLearningNotification(
  event: LearningNotificationEvent,
): Promise<boolean> {
  if ((await getNotificationPermissionState()) !== "granted") {
    return false;
  }

  const now = Date.now();
  const ledger = await readNumberRecord(eventLedgerStorageKey);
  const activeEntries = Object.fromEntries(
    Object.entries(ledger).filter(([, timestamp]) => now - timestamp < eventRetentionMs),
  );
  if (activeEntries[event.dedupeKey]) {
    return false;
  }

  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: event.title,
      body: event.body,
      data: { path: event.path, eventKey: event.dedupeKey },
      sound: "default",
    },
    trigger: { channelId },
  });
  activeEntries[event.dedupeKey] = now;
  await writeJson(eventLedgerStorageKey, activeEntries);
  return true;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync(channelId, {
    name: "學習提醒",
    description: "每日學習、到期複習與學習進度通知",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

function toPermissionState(
  status: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  if (status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return "granted";
  }
  return status.status === "denied" ? "denied" : "undetermined";
}

async function readStringArray(key: string): Promise<string[]> {
  const value = await readJson(key);
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

async function readNumberRecord(key: string): Promise<Record<string, number>> {
  const value = await readJson(key);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

async function readJson(key: string): Promise<unknown> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
