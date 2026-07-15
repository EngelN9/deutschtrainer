import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CatalogCourse } from "@deutschtrainer/shared-types";
import { create } from "zustand";
import { ApiClientError } from "../../lib/apiClient";
import { submitRemoteAttempt } from "../learning-records/learningRecordsRepository";
import {
  emptyOfflineProfileData,
  enqueueOfflineAttempt,
  parseOfflineStorage,
  removeDownloadedCourse,
  removeOfflineAttempt,
  saveDownloadedCourse,
  updateOfflineAttempt,
  type EnqueueOfflineAttemptInput,
  type OfflineProfiles,
} from "./offlineModel";

const OFFLINE_STORAGE_KEY = "deutschtrainer-phase12-offline";

export interface OfflineSyncSummary {
  adjustedCount: number;
  completedAt: string;
  conflictCount: number;
  failedCount: number;
  syncedCount: number;
}

interface OfflineState {
  profiles: OfflineProfiles;
  hasHydrated: boolean;
  syncStatus: "idle" | "syncing";
  lastSyncProfileId?: string;
  lastSyncError?: string;
  lastSyncSummary?: OfflineSyncSummary;
  hydrate: () => Promise<void>;
  downloadCourse: (profileId: string, course: CatalogCourse) => Promise<void>;
  removeCourse: (profileId: string, courseId: string) => Promise<void>;
  enqueueAttempt: (input: EnqueueOfflineAttemptInput) => Promise<void>;
  retryAttempt: (profileId: string, idempotencyKey: string) => Promise<void>;
  discardAttempt: (profileId: string, idempotencyKey: string) => Promise<void>;
  syncPendingAttempts: (profileId: string) => Promise<OfflineSyncSummary>;
}

let hydrationPromise: Promise<void> | undefined;
const syncPromises = new Map<string, Promise<OfflineSyncSummary>>();

export const useOfflineStore = create<OfflineState>((set, get) => ({
  profiles: {},
  hasHydrated: false,
  syncStatus: "idle",

  hydrate: async () => {
    if (get().hasHydrated) {
      return;
    }
    hydrationPromise ??= (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      } catch {
        set({ profiles: {}, hasHydrated: true });
        return;
      }
      let parsed: unknown = {};
      if (raw) {
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          parsed = {};
        }
      }
      set({ profiles: parseOfflineStorage(parsed), hasHydrated: true });
    })().finally(() => {
      hydrationPromise = undefined;
    });
    await hydrationPromise;
  },

  downloadCourse: async (profileId, course) => {
    const next = saveDownloadedCourse(get().profiles, profileId, course, new Date().toISOString());
    await writeOfflineProfiles(next);
    set({ profiles: next });
  },

  removeCourse: async (profileId, courseId) => {
    const next = removeDownloadedCourse(get().profiles, profileId, courseId);
    await writeOfflineProfiles(next);
    set({ profiles: next });
  },

  enqueueAttempt: async (input) => {
    const next = enqueueOfflineAttempt(get().profiles, input);
    await writeOfflineProfiles(next);
    set({ profiles: next });
  },

  retryAttempt: async (profileId, idempotencyKey) => {
    const next = updateOfflineAttempt(get().profiles, profileId, idempotencyKey, {
      status: "pending",
      lastError: undefined,
    });
    await writeOfflineProfiles(next);
    set({ profiles: next });
  },

  discardAttempt: async (profileId, idempotencyKey) => {
    const next = removeOfflineAttempt(get().profiles, profileId, idempotencyKey);
    await writeOfflineProfiles(next);
    set({ profiles: next });
  },

  syncPendingAttempts: async (profileId) => {
    const running = syncPromises.get(profileId);
    if (running) {
      return running;
    }

    const syncPromise = (async () => {
      set({
        syncStatus: "syncing",
        lastSyncError: undefined,
        lastSyncProfileId: profileId,
      });
      let syncedCount = 0;
      let adjustedCount = 0;
      let conflictCount = 0;
      let failedCount = 0;
      const candidates = Object.values(
        get().profiles[profileId]?.pendingAttempts ?? emptyOfflineProfileData.pendingAttempts,
      )
        .filter((attempt) => attempt.status !== "conflict")
        .sort(
          (left, right) =>
            new Date(left.request.submittedAt).getTime() -
            new Date(right.request.submittedAt).getTime(),
        );

      for (const candidate of candidates) {
        const current =
          get().profiles[profileId]?.pendingAttempts[candidate.request.idempotencyKey];
        if (!current || current.status === "conflict") {
          continue;
        }

        await replaceProfiles(
          updateOfflineAttempt(get().profiles, profileId, current.request.idempotencyKey, {
            status: "syncing",
            retryCount: current.retryCount + 1,
            lastError: undefined,
          }),
          set,
        );

        try {
          const remote = await submitRemoteAttempt(current.request);
          if (
            remote.gradingResult.score !== current.localGradingResult.score ||
            remote.gradingResult.isCorrect !== current.localGradingResult.isCorrect
          ) {
            adjustedCount += 1;
          }
          syncedCount += 1;
          await replaceProfiles(
            removeOfflineAttempt(get().profiles, profileId, current.request.idempotencyKey),
            set,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "同步作答失敗。";
          const conflict = isPermanentSyncConflict(error);
          if (conflict) {
            conflictCount += 1;
          } else {
            failedCount += 1;
          }
          await replaceProfiles(
            updateOfflineAttempt(get().profiles, profileId, current.request.idempotencyKey, {
              status: conflict ? "conflict" : "failed",
              lastError: message,
            }),
            set,
          );
          set({ lastSyncError: message });
          if (!conflict) {
            break;
          }
        }
      }

      const summary: OfflineSyncSummary = {
        adjustedCount,
        completedAt: new Date().toISOString(),
        conflictCount,
        failedCount,
        syncedCount,
      };
      set({ lastSyncSummary: summary });
      return summary;
    })();
    syncPromises.set(profileId, syncPromise);

    try {
      return await syncPromise;
    } finally {
      syncPromises.delete(profileId);
      set({ syncStatus: "idle" });
    }
  },
}));

function isPermanentSyncConflict(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 401 &&
    error.status !== 403 &&
    error.status !== 429
  );
}

async function replaceProfiles(
  profiles: OfflineProfiles,
  set: (partial: Partial<OfflineState>) => void,
): Promise<void> {
  await writeOfflineProfiles(profiles);
  set({ profiles });
}

async function writeOfflineProfiles(profiles: OfflineProfiles): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify({ version: 1, profiles }));
}
