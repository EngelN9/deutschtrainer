import type { CefrLevel } from "@deutschtrainer/shared-types";
import { create } from "zustand";

interface LearningSetupState {
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
  setCurrentLevel: (level: CefrLevel) => void;
  setTargetLevel: (level: CefrLevel) => void;
}

export const useLearningSetupStore = create<LearningSetupState>((set) => ({
  currentLevel: "B1",
  targetLevel: "B2",
  setCurrentLevel: (level) => set({ currentLevel: level }),
  setTargetLevel: (level) => set({ targetLevel: level }),
}));
