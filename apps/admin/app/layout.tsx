import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { colorTokens, elevationTokens, radiusTokens } from "@deutschtrainer/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeutschTrainer",
  description: "面向繁體中文使用者的德語 B1–C2 自學系統。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const designTokens = {
    "--background": colorTokens.background,
    "--surface": colorTokens.surface,
    "--surface-soft": colorTokens.surfaceMuted,
    "--ink": colorTokens.text,
    "--muted": colorTokens.mutedText,
    "--line": colorTokens.border,
    "--line-strong": colorTokens.borderStrong,
    "--brand": colorTokens.primary,
    "--brand-dark": colorTokens.primaryDark,
    "--accent": colorTokens.accent,
    "--blue": colorTokens.primary,
    "--amber": colorTokens.warning,
    "--red": colorTokens.danger,
    "--sidebar": "#10264B",
    "--radius-card": `${radiusTokens.lg}px`,
    "--radius-control": `${radiusTokens.md}px`,
    "--shadow-card": elevationTokens.card,
  } as CSSProperties;

  return (
    <html lang="zh-Hant" style={designTokens}>
      <body>{children}</body>
    </html>
  );
}
