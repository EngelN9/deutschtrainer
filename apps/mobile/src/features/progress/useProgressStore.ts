import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExerciseProgressResult } from "@deutschtrainer/shared-types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  emptyUserProgress,
  recordExerciseResult,
  resetLessonProgress,
  type UserLearningProgress,
} from "./progressModel";

interface ProgressState {
  byUserId: Record<string, UserLearningProgress>;
  hasHydrated: boolean;
  recordResult: (
    userId: string,
    result: ExerciseProgressResult,
    totalExercises: number,
    exerciseIndex: number,
  ) => Promise<void>;
  resetLesson: (userId: string, lessonId: string) => Promise<void>;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      byUserId: {},
      hasHydrated: false,
      recordResult: async (userId, result, totalExercises, exerciseIndex) => {
        let nextByUserId: Record<string, UserLearningProgress> = {};
        set((state) => {
          nextByUserId = {
            ...state.byUserId,
            [userId]: recordExerciseResult(state.byUserId[userId] ?? emptyUserProgress, {
              exerciseIndex,
              result,
              totalExercises,
            }),
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
