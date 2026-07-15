export type NotificationPermissionState = "granted" | "denied" | "undetermined" | "unsupported";

export interface LearningNotificationEvent {
  body: string;
  dedupeKey: string;
  path: string;
  title: string;
}
