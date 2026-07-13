import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EvaluateWritingRequest } from "@deutschtrainer/validation";
import { useAuthStore } from "../auth/useAuthStore";
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
    onSuccess: async () => {
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
