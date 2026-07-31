import { clearNotificationProfileData } from "../notifications/NotificationCoordinator";
import { clearAccountNotifications } from "../notifications/notificationRuntime";
import { useOfflineStore } from "../offline/useOfflineStore";
import { useProgressStore } from "../progress/useProgressStore";
import { clearCachedUserSettings } from "./settingsCache";

export async function clearLocalAccountData(input: {
  authUserId: string;
  profileId: string;
}): Promise<void> {
  await clearAccountNotifications(input.profileId);
  await Promise.all([
    clearCachedUserSettings(input.authUserId),
    clearNotificationProfileData(input.profileId),
    useOfflineStore.getState().clearProfile(input.profileId),
    useProgressStore.getState().clearUser(input.profileId),
  ]);
}
