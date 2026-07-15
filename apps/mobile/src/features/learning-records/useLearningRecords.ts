import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../auth/useAuthStore";
import { useProgressStore } from "../progress/useProgressStore";
import { useConnectivityStore } from "../offline/connectivityStore";
import { mobileEnv } from "../../lib/env";
import {
  createEmptyLearningRecordSnapshot,
  mergeOfflineLearningRecords,
} from "./learningRecordsModel";
import { getRemoteLearningRecords } from "./learningRecordsRepository";

export function useLearningRecords() {
  const profile = useAuthStore((state) => state.profile);
  const localRecords = useProgressStore((state) =>
    profile ? state.byUserId[profile.id]?.learningRecords : undefined,
  );
  const connectivity = useConnectivityStore((state) => state.status);
  const query = useQuery({
    queryKey: learningRecordsQueryKey(profile?.id),
    queryFn: getRemoteLearningRecords,
    enabled: Boolean(profile && mobileEnv.contentSource === "api" && connectivity !== "offline"),
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

  if (connectivity === "offline") {
    return {
      ...query,
      data: mergeOfflineLearningRecords(query.data, localRecords),
      isError: false,
      isLoading: false,
    };
  }

  return query;
}

export function learningRecordsQueryKey(profileId?: string) {
  return ["learning-records", profileId, mobileEnv.contentSource] as const;
}
