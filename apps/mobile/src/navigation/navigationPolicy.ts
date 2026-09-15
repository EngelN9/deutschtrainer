export type NavigationAuthMode = "demo" | "supabase" | null;

export type NavigationGroupId = "today" | "learn" | "practice" | "classroom" | "progress";

export interface NavigationSection {
  label: string;
  path: string;
}

export interface NavigationGroup {
  id: NavigationGroupId;
  label: string;
  // The first section is where the tab itself goes.
  sections: readonly NavigationSection[];
}

const allGroups: readonly NavigationGroup[] = [
  { id: "today", label: "今日", sections: [{ label: "今日", path: "/home" }] },
  {
    id: "learn",
    label: "課程",
    sections: [
      { label: "課程地圖", path: "/courses" },
      { label: "單字與文法", path: "/knowledge" },
    ],
  },
  {
    id: "practice",
    label: "練習",
    sections: [
      { label: "寫作", path: "/writing" },
      { label: "聽說", path: "/audio-training" },
    ],
  },
  { id: "classroom", label: "教室", sections: [{ label: "教室", path: "/classroom" }] },
  {
    id: "progress",
    label: "進度",
    sections: [
      { label: "複習", path: "/reviews" },
      { label: "分析", path: "/analytics" },
    ],
  },
];

// Demo mode runs without an account, so only the offline-capable destinations are offered.
const demoPaths = new Set(["/home", "/courses", "/reviews"]);

export function getNavigationGroups(
  authMode: NavigationAuthMode,
  classroomEnabled: boolean,
): NavigationGroup[] {
  return allGroups
    .filter((group) => classroomEnabled || group.id !== "classroom")
    .map((group) =>
      authMode === "demo"
        ? { ...group, sections: group.sections.filter((section) => demoPaths.has(section.path)) }
        : group,
    )
    .filter((group) => group.sections.length > 0);
}

export function findActiveGroup(
  groups: readonly NavigationGroup[],
  pathname: string,
): NavigationGroup | undefined {
  return groups.find((group) => group.sections.some((section) => section.path === pathname));
}
