import { describe, expect, it } from "@jest/globals";
import { cssTokens } from "./cssTokens";
import {
  accessibilityTokens,
  colorTokens,
  elevationTokens,
  motionTokens,
  spacingTokens,
  typographyTokens,
} from "./index";

describe("cssTokens", () => {
  it("maps semantic public colors to the shared palette", () => {
    expect(cssTokens).toMatchObject({
      "--background": colorTokens.background,
      "--surface": colorTokens.surface,
      "--surface-soft": colorTokens.surfaceMuted,
      "--ink": colorTokens.text,
      "--muted": colorTokens.mutedText,
      "--line": colorTokens.border,
      "--brand": colorTokens.primary,
      "--brand-soft": colorTokens.primarySoft,
      "--focus-ring": colorTokens.focusRing,
      "--ai": colorTokens.ai,
      "--offline": colorTokens.offline,
      "--restricted": colorTokens.restricted,
    });
  });

  it("exports only valid CSS custom property names (starting with --)", () => {
    for (const key of Object.keys(cssTokens)) {
      expect(key).toMatch(/^--[a-z]/);
    }
  });

  it("exports only non-empty CSS values", () => {
    for (const value of Object.values(cssTokens)) {
      expect(value.trim()).not.toBe("");
    }
  });

  it("converts shared dimensions and motion values to CSS units", () => {
    expect(cssTokens["--font-sans"]).toBe(typographyTokens.fontFamily.sans);
    expect(cssTokens["--space-md"]).toBe(`${spacingTokens.md}px`);
    expect(cssTokens["--motion-standard"]).toBe(`${motionTokens.standard}ms`);
    expect(cssTokens["--touch-target"]).toBe(`${accessibilityTokens.minTouchTarget}px`);
    expect(cssTokens["--shadow-card"]).toBe(elevationTokens.card);
  });
});
