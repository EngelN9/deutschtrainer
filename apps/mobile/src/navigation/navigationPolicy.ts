export type NavigationAuthMode = "demo" | "supabase" | null;
export type NavigationLayout = "bar" | "rail";

export type Capability =
  | "home"
  | "courses"
  | "writing"
  | "reviews"
  | "knowledge"
  | "audio"
  | "analytics"
  | "offline"
  | "settings"
  | "more";

export interface NavigationItem {
  capability: Capability;
  href: string;
  label: string;
  modes: Array<Exclude<NavigationAuthMode, null>>;
}

const primaryItems: NavigationItem[] = [
  { capability: "home", href: "/home", label: "今日", modes: ["demo", "supabase"] },
  { capability: "courses", href: "/courses", label: "課程", modes: ["demo", "supabase"] },
  { capability: "writing", href: "/writing", label: "寫作", modes: ["supabase"] },
  { capability: "reviews", href: "/reviews", label: "複習", modes: ["demo", "supabase"] },
  { capability: "more", href: "/more", label: "更多", modes: ["demo", "supabase"] },
];

const moreItems: NavigationItem[] = [
  { capability: "knowledge", href: "/knowledge", label: "知識中心", modes: ["supabase"] },
  { capability: "audio", href: "/audio-training", label: "聽說訓練", modes: ["supabase"] },
  { capability: "analytics", href: "/analytics", label: "學習分析", modes: ["supabase"] },
  { capability: "offline", href: "/offline", label: "離線與同步", modes: ["demo", "supabase"] },
  { capability: "settings", href: "/settings", label: "個人設定", modes: ["demo", "supabase"] },
];

export function getPrimaryNavigationItems(
  authMode: NavigationAuthMode,
  layout: NavigationLayout,
): NavigationItem[] {
  if (!authMode) {
    return [];
  }

  const visiblePrimary = primaryItems.filter((item) => item.modes.includes(authMode));
  if (layout === "bar" || authMode === "demo") {
    return visiblePrimary;
  }

  const expandedCapabilities: Capability[] = ["knowledge", "audio", "analytics"];
  const expandedItems = moreItems.filter(
    (item) => item.modes.includes(authMode) && expandedCapabilities.includes(item.capability),
  );
  return [
    ...visiblePrimary.filter((item) => item.capability !== "more"),
    ...expandedItems,
    visiblePrimary.find((item) => item.capability === "more"),
  ].filter((item): item is NavigationItem => Boolean(item));
}

export function getMoreCapabilities(authMode: NavigationAuthMode): NavigationItem[] {
  return authMode ? moreItems.filter((item) => item.modes.includes(authMode)) : [];
}

export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  if (item.capability === "more") {
    return pathname === "/more" || moreItems.some((entry) => pathMatches(pathname, entry.href));
  }
  return pathMatches(pathname, item.href);
}

function pathMatches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
