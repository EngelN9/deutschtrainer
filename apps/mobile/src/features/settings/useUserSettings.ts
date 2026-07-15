import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateNotificationPreferencesRequest,
  UserSettingsResponse,
} from "@deutschtrainer/validation";
import { useAuthStore } from "../auth/useAuthStore";
import { getUserSettings, updateNotificationPreferences } from "./settingsRepository";

export function useUserSettings() {
  const profile = useAuthStore((state) => state.profile);
  return useQuery({
    queryKey: userSettingsQueryKey(profile?.id),
    queryFn: () => getUserSettings(profile?.authUserId),
    enabled: Boolean(profile),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  return useMutation({
    mutationFn: (request: UpdateNotificationPreferencesRequest) =>
      updateNotificationPreferences(request, profile?.authUserId),
    onSuccess: (response) => {
      queryClient.setQueryData<UserSettingsResponse>(
        userSettingsQueryKey(profile?.id),
        (current) =>
          current
            ? {
                ...current,
                profile: { ...current.profile, timezone: response.notifications.timezone },
                notifications: response.notifications,
              }
            : current,
      );
    },
  });
}

export function userSettingsQueryKey(profileId?: string) {
  return ["user-settings", profileId] as const;
}
