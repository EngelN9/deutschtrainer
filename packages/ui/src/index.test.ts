import {
  accessibilityTokens,
  colorTokens,
  elevationTokens,
  motionTokens,
  nativeElevationTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "./index";

/**
 * Computes the relative luminance of a hex color according to WCAG 2.1 specs.
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes the WCAG contrast ratio between two hex colors.
 */
function getContrastRatio(colorA: string, colorB: string): number {
  const lumA = getLuminance(colorA);
  const lumB = getLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("@deutschtrainer/ui design tokens", () => {
  describe("Accessibility and WCAG AA contrast", () => {
    it("guarantees high text contrast on primary surfaces", () => {
      const textOnBackground = getContrastRatio(colorTokens.text, colorTokens.background);
      const textOnSurface = getContrastRatio(colorTokens.text, colorTokens.surface);

      expect(textOnBackground).toBeGreaterThanOrEqual(7.0); // WCAG AAA
      expect(textOnSurface).toBeGreaterThanOrEqual(7.0);
    });

    it("guarantees WCAG AA (>= 4.5:1) for muted secondary text", () => {
      const mutedOnBackground = getContrastRatio(colorTokens.mutedText, colorTokens.background);
      const mutedOnSurface = getContrastRatio(colorTokens.mutedText, colorTokens.surface);

      expect(mutedOnBackground).toBeGreaterThanOrEqual(4.5);
      expect(mutedOnSurface).toBeGreaterThanOrEqual(4.5);
    });

    it("guarantees WCAG AA (>= 4.5:1) for strong button labels on filled backgrounds", () => {
      expect(getContrastRatio(colorTokens.onStrong, colorTokens.primary)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        getContrastRatio(colorTokens.onStrong, colorTokens.primaryDark),
      ).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(colorTokens.onStrong, colorTokens.success)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(colorTokens.onStrong, colorTokens.danger)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(colorTokens.onStrong, colorTokens.accent)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(colorTokens.onStrong, colorTokens.teal)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(colorTokens.onStrong, colorTokens.aiDark)).toBeGreaterThanOrEqual(
        7.0,
      );
    });

    it("enforces minimum touch target of 44x44 px", () => {
      expect(accessibilityTokens.minTouchTarget).toBeGreaterThanOrEqual(44);
    });
  });

  describe("Semantic domain tokens", () => {
    it("defines distinct AI Tutor semantic tokens", () => {
      expect(colorTokens.ai).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.aiSoft).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.aiDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.aiBorder).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("defines distinct Offline and Queue semantic tokens", () => {
      expect(colorTokens.offline).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.offlineSoft).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.offlineBorder).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.offlineDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("defines distinct Restricted Access and Quota tokens", () => {
      expect(colorTokens.restricted).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.restrictedSoft).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.restrictedBorder).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colorTokens.restrictedDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("defines a visible high-contrast focus ring token", () => {
      expect(colorTokens.focusRing).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(
        getContrastRatio(colorTokens.focusRing, colorTokens.background),
      ).toBeGreaterThanOrEqual(3);
      expect(getContrastRatio(colorTokens.focusRing, colorTokens.surface)).toBeGreaterThanOrEqual(
        3,
      );
      expect(
        getContrastRatio(colorTokens.focusRingOnStrong, colorTokens.primary),
      ).toBeGreaterThanOrEqual(3);
    });

    it("keeps semantic labels readable on their soft backgrounds", () => {
      expect(getContrastRatio(colorTokens.aiDark, colorTokens.aiSoft)).toBeGreaterThanOrEqual(4.5);
      expect(
        getContrastRatio(colorTokens.offlineDark, colorTokens.offlineSoft),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        getContrastRatio(colorTokens.restrictedDark, colorTokens.restrictedSoft),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Typography and Layout scales", () => {
    it("orders typography sizes hierarchically", () => {
      expect(typographyTokens.display.fontSize).toBeGreaterThan(typographyTokens.title.fontSize);
      expect(typographyTokens.title.fontSize).toBeGreaterThan(typographyTokens.heading.fontSize);
      expect(typographyTokens.heading.fontSize).toBeGreaterThan(
        typographyTokens.subheading.fontSize,
      );
      expect(typographyTokens.subheading.fontSize).toBeGreaterThan(typographyTokens.body.fontSize);
      expect(typographyTokens.body.fontSize).toBeGreaterThan(typographyTokens.bodySmall.fontSize);
    });

    it("provides cross-platform font families for Latin and Traditional Chinese", () => {
      expect(typographyTokens.fontFamily.sans).toContain("Noto Sans TC");
      expect(typographyTokens.fontFamily.serif).toContain("Noto Serif TC");
      expect(typographyTokens.fontFamily.mono).toContain("monospace");
      expect(typographyTokens.nativeFontFamily.sans).toBe("System");
      expect(typographyTokens.nativeFontFamily.serif).toBe("serif");
      expect(typographyTokens.nativeFontFamily.mono).toBe("monospace");
    });

    it("defines positive spacing and radius steps", () => {
      expect(spacingTokens.xxs).toBe(2);
      expect(spacingTokens.xs).toBe(4);
      expect(spacingTokens.sm).toBe(8);
      expect(spacingTokens.md).toBe(16);
      expect(spacingTokens.lg).toBe(24);
      expect(spacingTokens.xl).toBe(32);
      expect(spacingTokens.xxl).toBe(40);

      expect(radiusTokens.sm).toBe(8);
      expect(radiusTokens.md).toBe(12);
      expect(radiusTokens.lg).toBe(16);
      expect(radiusTokens.pill).toBe(999);
    });

    it("defines valid elevation tokens", () => {
      expect(elevationTokens.none).toBe("none");
      expect(elevationTokens.raised).toContain("rgba");
      expect(elevationTokens.card).toContain("rgba");
      expect(elevationTokens.floating).toContain("rgba");
    });

    it("defines React Native-compatible elevation tokens", () => {
      expect(nativeElevationTokens.none.elevation).toBe(0);
      expect(nativeElevationTokens.none.shadowOpacity).toBe(0);

      const elevatedTokens = [
        nativeElevationTokens.raised,
        nativeElevationTokens.card,
        nativeElevationTokens.floating,
      ];

      elevatedTokens.forEach((token) => {
        expect(token.elevation).toBeGreaterThan(0);
        expect(token.shadowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(token.shadowOffset.width).toBe(0);
        expect(token.shadowOffset.height).toBeGreaterThan(0);
        expect(token.shadowOpacity).toBeGreaterThan(0);
        expect(token.shadowRadius).toBeGreaterThan(0);
      });
    });

    it("defines motion timings in milliseconds", () => {
      expect(motionTokens.fast).toBe(120);
      expect(motionTokens.standard).toBe(180);
      expect(motionTokens.deliberate).toBe(240);
    });
  });
});
