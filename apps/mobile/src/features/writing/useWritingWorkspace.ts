import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EvaluateWritingRequest, UserSettingsResponse } from "@deutschtrainer/validation";
import { useAuthStore } from "../auth/useAuthStore";
import { presentLearningNotification } from "../notifications/notificationRuntime";
import { userSettingsQueryKey } from "../settings/useUserSettings";
import { deleteWritingSubmission, getWritingWorkspace, submitWriting } from "./writingRepository";

export function useWritingWorkspace() {
  const profile = useAuthStore((state) => state.profile);
  return useQuery({
    queryKey: writingWorkspaceQueryKey(profile?.id),
    queryFn: getWritingWorkspace,
    enabled: Boolean(profile),
    staleTime: 15 * 1000,
    retry: 1,
  });
}

export function useSubmitWriting() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  return useMutation({
    mutationFn: (request: EvaluateWritingRequest) => submitWriting(request),
    onSuccess: async (response) => {
      const settings = queryClient.getQueryData<UserSettingsResponse>(
        userSettingsQueryKey(profile?.id),
      );
      if (
        profile &&
        settings?.notifications.notificationsEnabled &&
        settings.notifications.writingCompleteEnabled
      ) {
        void presentLearningNotification({
          title: "作文批改完成",
          body: "新的分項評分與修改建議已經準備完成。",
          path: `/writing/${response.submissionId}`,
          dedupeKey: `writing:${profile.id}:${response.versionId}`,
        }).catch(() => undefined);
      }
      await queryClient.invalidateQueries({ queryKey: writingWorkspaceQueryKey(profile?.id) });
    },
  });
}

export function useDeleteWritingSubmission() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  return useMutation({
    mutationFn: deleteWritingSubmission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: writingWorkspaceQueryKey(profile?.id) });
    },
  });
}

export function writingWorkspaceQueryKey(profileId?: string) {
  return ["writing-workspace", profileId] as const;
}
