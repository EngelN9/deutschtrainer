export const responsiveBreakpoints = {
  medium: 600,
  wide: 1024,
} as const;

export type ResponsiveLayoutSize = "compact" | "medium" | "wide";

export interface ResponsiveLayout {
  isCompact: boolean;
  isMedium: boolean;
  isWide: boolean;
  size: ResponsiveLayoutSize;
}

export function getResponsiveLayout(width: number): ResponsiveLayout {
  if (width >= responsiveBreakpoints.wide) {
    return { isCompact: false, isMedium: false, isWide: true, size: "wide" };
  }

  if (width >= responsiveBreakpoints.medium) {
    return { isCompact: false, isMedium: true, isWide: false, size: "medium" };
  }

  return { isCompact: true, isMedium: false, isWide: false, size: "compact" };
}
