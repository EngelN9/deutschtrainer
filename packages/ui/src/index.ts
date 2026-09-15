export const colorTokens = {
  // Base surfaces and text
  background: "#FBFAF7",
  surface: "#FFFFFF",
  surfaceMuted: "#F4F7FB",
  text: "#17233C",
  mutedText: "#526079",
  onStrong: "#FFFFFF",

  // Core brand and interaction
  primary: "#175CD3",
  primaryDark: "#174AA5",
  primarySoft: "#EAF2FF",
  focusRing: "#175CD3",
  focusRingOnStrong: "#FFFFFF",

  // Borders and dividers
  border: "#D7DFEA",
  borderStrong: "#B8C4D6",
  borderInput: "#7A8599",
  subtle: "#F1F4F8",

  // Editorial & German language anchors
  accent: "#B54708",
  accentSoft: "#FFF2E8",
  teal: "#0E766E",
  tealSoft: "#EAF7F5",

  // Status indicators
  success: "#147A4A",
  successSoft: "#EAF7EF",
  warning: "#9A5B00",
  warningSoft: "#FFF5D9",
  danger: "#B42318",
  dangerSoft: "#FDECEC",

  // Semantic domain tokens: AI Tutor & Classroom
  ai: "#4F46E5",
  aiDark: "#3730A3",
  aiSoft: "#EEF2FF",
  aiBorder: "#C7D2FE",

  // Semantic domain tokens: Offline & Sync Queue
  offline: "#B45309",
  offlineDark: "#78350F",
  offlineSoft: "#FEF3C7",
  offlineBorder: "#FDE68A",

  // Semantic domain tokens: Restricted Beta & Guest Limits
  restricted: "#475467",
  restrictedDark: "#1D2939",
  restrictedSoft: "#F2F4F7",
  restrictedBorder: "#D0D5DD",
} as const;

export const typographyTokens = {
  display: { fontSize: 36, lineHeight: 44, fontWeight: "700", letterSpacing: -0.5 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: "700", letterSpacing: -0.3 },
  heading: { fontSize: 22, lineHeight: 29, fontWeight: "700", letterSpacing: -0.2 },
  subheading: { fontSize: 18, lineHeight: 25, fontWeight: "700", letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400", letterSpacing: 0 },
  bodySmall: { fontSize: 14, lineHeight: 21, fontWeight: "400", letterSpacing: 0 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700", letterSpacing: 0.1 },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: "600", letterSpacing: 0.2 },
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
    serif: "'Source Serif 4', Georgia, 'Noto Serif TC', Cambria, serif",
    mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
  },
  nativeFontFamily: {
    sans: "System",
    serif: "serif",
    mono: "monospace",
  },
} as const;

export const spacingTokens = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radiusTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const elevationTokens = {
  none: "none",
  raised: "0 1px 2px rgba(23, 35, 60, 0.08)",
  card: "0 10px 30px rgba(23, 35, 60, 0.08)",
  floating: "0 18px 44px rgba(23, 35, 60, 0.14)",
} as const;

export const nativeElevationTokens = {
  none: {
    elevation: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  raised: {
    elevation: 1,
    shadowColor: "#17233C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  card: {
    elevation: 4,
    shadowColor: "#17233C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
  },
  floating: {
    elevation: 8,
    shadowColor: "#17233C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
} as const;

export const motionTokens = {
  fast: 120,
  standard: 180,
  deliberate: 240,
} as const;

export const accessibilityTokens = {
  minTouchTarget: 44,
  maxContentWidth: 1200,
  maxReadingWidth: 680,
} as const;

export type ColorTokens = typeof colorTokens;
export type TypographyTokens = typeof typographyTokens;
export type SpacingTokens = typeof spacingTokens;
export type RadiusTokens = typeof radiusTokens;
export type ElevationTokens = typeof elevationTokens;
export type NativeElevationTokens = typeof nativeElevationTokens;
export type MotionTokens = typeof motionTokens;
export type AccessibilityTokens = typeof accessibilityTokens;
