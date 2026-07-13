import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  emptyUserProgress,
  recordLearningAttempt,
  resetLessonProgress,
  type UserLearningProgress,
} from "./progressModel";
import type { LearningAttemptInput } from "../learning-records/learningRecordsModel";

interface ProgressState {
  byUserId: Record<string, UserLearningProgress>;
  hasHydrated: boolean;
  recordAttempt: (input: LearningAttemptInput & { exerciseIndex: number }) => Promise<void>;
  resetLesson: (userId: string, lessonId: string) => Promise<void>;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      byUserId: {},
      hasHydrated: false,
      recordAttempt: async (input) => {
        let nextByUserId: Record<string, UserLearningProgress> = {};
        set((state) => {
          nextByUserId = {
            ...state.byUserId,
            [input.userId]: recordLearningAttempt(
              state.byUserId[input.userId] ?? emptyUserProgress,
              input,
            ),
          };
          return { byUserId: nextByUserId };
        });
        await writeProgress(nextByUserId);
      },
      resetLesson: async (userId, lessonId) => {
        let nextByUserId: Record<string, UserLearningProgress> = {};
        set((state) => {
          nextByUserId = {
            ...state.byUserId,
            [userId]: resetLessonProgress(state.byUserId[userId] ?? emptyUserProgress, lessonId),
          };
          return { byUserId: nextByUserId };
        });
        await writeProgress(nextByUserId);
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "deutschtrainer-phase3-progress",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ byUserId: state.byUserId }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      version: 1,
    },
  ),
);

async function writeProgress(byUserId: Record<string, UserLearningProgress>): Promise<void> {
  await AsyncStorage.setItem(
    "deutschtrainer-phase3-progress",
    JSON.stringify({ state: { byUserId }, version: 1 }),
  );
}
