export const colorTokens = {
  background: "#FBFAF7",
  surface: "#FFFFFF",
  surfaceMuted: "#F4F7FB",
  text: "#17233C",
  mutedText: "#526079",
  primary: "#175CD3",
  primaryDark: "#174AA5",
  primarySoft: "#EAF2FF",
  border: "#D7DFEA",
  borderStrong: "#B8C4D6",
  subtle: "#F1F4F8",
  accent: "#B54708",
  accentSoft: "#FFF2E8",
  teal: "#0E766E",
  tealSoft: "#EAF7F5",
  success: "#147A4A",
  successSoft: "#EAF7EF",
  warning: "#9A5B00",
  warningSoft: "#FFF5D9",
  danger: "#B42318",
  dangerSoft: "#FDECEC",
  onStrong: "#FFFFFF",
  focusRing: "#84ADFF",
} as const;

export const typographyTokens = {
  display: { fontSize: 36, lineHeight: 44, fontWeight: "800" },
  title: { fontSize: 30, lineHeight: 38, fontWeight: "800" },
  heading: { fontSize: 22, lineHeight: 29, fontWeight: "800" },
  subheading: { fontSize: 18, lineHeight: 25, fontWeight: "800" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodySmall: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const elevationTokens = {
  raised: "0 1px 2px rgba(23, 35, 60, 0.08)",
  card: "0 10px 30px rgba(23, 35, 60, 0.08)",
  floating: "0 18px 44px rgba(23, 35, 60, 0.14)",
} as const;

export const motionTokens = {
  fast: 120,
  standard: 180,
  deliberate: 240,
} as const;

export type ColorTokens = typeof colorTokens;
export type TypographyTokens = typeof typographyTokens;
export type SpacingTokens = typeof spacingTokens;
export type RadiusTokens = typeof radiusTokens;
export type ElevationTokens = typeof elevationTokens;
export type MotionTokens = typeof motionTokens;
