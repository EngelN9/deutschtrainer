import { useQuery } from "@tanstack/react-query";
import { mobileEnv } from "../../lib/env";
import { useAuthStore } from "../auth/useAuthStore";
import { useConnectivityStore } from "../offline/connectivityStore";
import { useOfflineStore } from "../offline/useOfflineStore";
import { getCourseCatalog } from "./courseRepository";

export function useCourseCatalog() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const offlineHydrated = useOfflineStore((state) => state.hasHydrated);
  const connectivity = useConnectivityStore((state) => state.status);
  return useQuery({
    queryKey: [
      ...courseCatalogQueryKey(profileId),
      connectivity === "offline" ? "offline" : "online",
    ],
    queryFn: () => getCourseCatalog(profileId),
    enabled: mobileEnv.contentSource !== "api" || offlineHydrated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function courseCatalogQueryKey(profileId?: string) {
  return ["course-catalog", profileId, mobileEnv.contentSource] as const;
}
