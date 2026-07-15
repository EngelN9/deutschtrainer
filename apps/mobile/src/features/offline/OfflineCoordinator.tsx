import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../auth/useAuthStore";
import { courseCatalogQueryKey } from "../courses/useCourseCatalog";
import { learningRecordsQueryKey } from "../learning-records/useLearningRecords";
import { connectivityStatusFromState, useConnectivityStore } from "./connectivityStore";
import { useOfflineStore } from "./useOfflineStore";

export function OfflineCoordinator() {
  const queryClient = useQueryClient();
  const profileId = useAuthStore((state) => state.profile?.id);
  const connectivity = useConnectivityStore((state) => state.status);
  const setConnectivity = useConnectivityStore((state) => state.setStatus);
  const hasHydrated = useOfflineStore((state) => state.hasHydrated);
  const hydrate = useOfflineStore((state) => state.hydrate);
  const syncPendingAttempts = useOfflineStore((state) => state.syncPendingAttempts);

  useEffect(() => {
    void hydrate();
    return NetInfo.addEventListener((state) => {
      setConnectivity(connectivityStatusFromState(state));
    });
  }, [hydrate, setConnectivity]);

  useEffect(() => {
    if (!hasHydrated || connectivity !== "online" || !profileId) {
      return;
    }

    void syncPendingAttempts(profileId)
      .then((summary) => {
        if (summary.syncedCount === 0) {
          return;
        }
        void queryClient.invalidateQueries({ queryKey: learningRecordsQueryKey(profileId) });
        void queryClient.invalidateQueries({ queryKey: courseCatalogQueryKey(profileId) });
      })
      .catch(() => undefined);
  }, [connectivity, hasHydrated, profileId, queryClient, syncPendingAttempts]);

  return null;
}
