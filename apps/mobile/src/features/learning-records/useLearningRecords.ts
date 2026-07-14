import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../auth/useAuthStore";
import { useProgressStore } from "../progress/useProgressStore";
import { mobileEnv } from "../../lib/env";
import { createEmptyLearningRecordSnapshot } from "./learningRecordsModel";
import { getRemoteLearningRecords } from "./learningRecordsRepository";

export function useLearningRecords() {
  const profile = useAuthStore((state) => state.profile);
  const localRecords = useProgressStore((state) =>
    profile ? state.byUserId[profile.id]?.learningRecords : undefined,
  );
  const query = useQuery({
    queryKey: learningRecordsQueryKey(profile?.id),
    queryFn: getRemoteLearningRecords,
    enabled: Boolean(profile && mobileEnv.contentSource === "api"),
    staleTime: 30 * 1000,
    retry: 1,
  });

  if (mobileEnv.contentSource === "mock") {
    return {
      ...query,
      data: localRecords ?? createEmptyLearningRecordSnapshot(),
      isError: false,
      isLoading: false,
    };
  }

  return query;
}

export function learningRecordsQueryKey(profileId?: string) {
  return ["learning-records", profileId, mobileEnv.contentSource] as const;
}
