import {
  accessibilityTokens,
  colorTokens,
  elevationTokens,
  motionTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "./index";

function pixels(value: number): string {
  return `${value}px`;
}

function milliseconds(value: number): string {
  return `${value}ms`;
}

/**
 * Typed mapping from UI design tokens to CSS custom properties for the public site.
 * Only the subset of tokens required by the public UI is exported.
 */
export const cssTokens = {
  "--background": colorTokens.background,
  "--surface": colorTokens.surface,
  "--surface-soft": colorTokens.surfaceMuted,
  "--ink": colorTokens.text,
  "--muted": colorTokens.mutedText,
  "--line": colorTokens.border,
  "--line-strong": colorTokens.borderStrong,
  "--brand": colorTokens.primary,
  "--brand-dark": colorTokens.primaryDark,
  "--brand-soft": colorTokens.primarySoft,
  "--focus-ring": colorTokens.focusRing,
  "--focus-ring-on-strong": colorTokens.focusRingOnStrong,
  "--blue": colorTokens.primary,
  "--amber": colorTokens.warning,
  "--red": colorTokens.danger,
  "--accent": colorTokens.accent,
  "--accent-soft": colorTokens.accentSoft,
  "--ai": colorTokens.ai,
  "--ai-dark": colorTokens.aiDark,
  "--ai-soft": colorTokens.aiSoft,
  "--ai-border": colorTokens.aiBorder,
  "--offline": colorTokens.offline,
  "--offline-dark": colorTokens.offlineDark,
  "--offline-soft": colorTokens.offlineSoft,
  "--offline-border": colorTokens.offlineBorder,
  "--restricted": colorTokens.restricted,
  "--restricted-dark": colorTokens.restrictedDark,
  "--restricted-soft": colorTokens.restrictedSoft,
  "--restricted-border": colorTokens.restrictedBorder,
  "--font-sans": typographyTokens.fontFamily.sans,
  "--font-serif": typographyTokens.fontFamily.serif,
  "--space-xs": pixels(spacingTokens.xs),
  "--space-sm": pixels(spacingTokens.sm),
  "--space-md": pixels(spacingTokens.md),
  "--space-lg": pixels(spacingTokens.lg),
  "--space-xl": pixels(spacingTokens.xl),
  "--space-xxl": pixels(spacingTokens.xxl),
  "--radius-sm": pixels(radiusTokens.sm),
  "--radius-md": pixels(radiusTokens.md),
  "--radius-lg": pixels(radiusTokens.lg),
  "--radius-xl": pixels(radiusTokens.xl),
  "--shadow-raised": elevationTokens.raised,
  "--shadow-card": elevationTokens.card,
  "--shadow-floating": elevationTokens.floating,
  "--motion-fast": milliseconds(motionTokens.fast),
  "--motion-standard": milliseconds(motionTokens.standard),
  "--motion-deliberate": milliseconds(motionTokens.deliberate),
  "--touch-target": pixels(accessibilityTokens.minTouchTarget),
  "--content-width": pixels(accessibilityTokens.maxContentWidth),
  "--reading-width": pixels(accessibilityTokens.maxReadingWidth),
} as const;

export type CssTokenMap = typeof cssTokens;
