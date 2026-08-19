export const allMainNavigationPaths = [
  "/home",
  "/courses",
  "/knowledge",
  "/writing",
  "/audio-training",
  "/reviews",
  "/analytics",
] as const;

export type MainNavigationPath = (typeof allMainNavigationPaths)[number];
type NavigationAuthMode = "demo" | "supabase" | null;

const demoMainNavigationPaths: readonly MainNavigationPath[] = [
  "/home",
  "/courses",
  "/audio-training",
  "/reviews",
];

export function getVisibleMainNavigationPaths(
  authMode: NavigationAuthMode,
): readonly MainNavigationPath[] {
  return authMode === "demo" ? demoMainNavigationPaths : allMainNavigationPaths;
}
