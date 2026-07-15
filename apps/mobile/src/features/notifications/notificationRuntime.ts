import type { ReminderPlanItem } from "./notificationPlan";
import type { LearningNotificationEvent, NotificationPermissionState } from "./notificationTypes";

export function initializeNotificationRuntime(): void {}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  return "unsupported";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  return "unsupported";
}

export async function syncScheduledReminders(
  _items: ReminderPlanItem[],
): Promise<NotificationPermissionState> {
  return "unsupported";
}

export async function presentLearningNotification(
  _event: LearningNotificationEvent,
): Promise<boolean> {
  return false;
}
