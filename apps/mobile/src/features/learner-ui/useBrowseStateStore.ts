import type { CefrLevel } from "@deutschtrainer/shared-types";
import { create } from "zustand";

interface BrowseState {
  courseLevel?: CefrLevel;
  courseScrollOffset: number;
  setCourseLevel: (level: CefrLevel) => void;
  setCourseScrollOffset: (offset: number) => void;
}

export const useBrowseStateStore = create<BrowseState>((set) => ({
  courseScrollOffset: 0,
  setCourseLevel: (courseLevel) => set({ courseLevel, courseScrollOffset: 0 }),
  setCourseScrollOffset: (courseScrollOffset) => set({ courseScrollOffset }),
}));
