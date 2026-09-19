import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { colorTokens, elevationTokens, radiusTokens, typographyTokens } from "@deutschtrainer/ui";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Classroom root element is missing.");

document.documentElement.style.setProperty("--dt-primary", colorTokens.primary);
document.documentElement.style.setProperty("--dt-primary-dark", colorTokens.primaryDark);
document.documentElement.style.setProperty("--dt-primary-soft", colorTokens.primarySoft);
document.documentElement.style.setProperty("--dt-background", colorTokens.background);
document.documentElement.style.setProperty("--dt-surface", colorTokens.surface);
document.documentElement.style.setProperty("--dt-surface-muted", colorTokens.surfaceMuted);
document.documentElement.style.setProperty("--dt-text", colorTokens.text);
document.documentElement.style.setProperty("--dt-muted-text", colorTokens.mutedText);
document.documentElement.style.setProperty("--dt-border", colorTokens.border);
document.documentElement.style.setProperty("--dt-border-strong", colorTokens.borderStrong);
document.documentElement.style.setProperty("--dt-focus", colorTokens.focusRing);
document.documentElement.style.setProperty("--dt-ai", colorTokens.ai);
document.documentElement.style.setProperty("--dt-ai-dark", colorTokens.aiDark);
document.documentElement.style.setProperty("--dt-ai-soft", colorTokens.aiSoft);
document.documentElement.style.setProperty("--dt-ai-border", colorTokens.aiBorder);
document.documentElement.style.setProperty("--dt-success", colorTokens.success);
document.documentElement.style.setProperty("--dt-success-soft", colorTokens.successSoft);
document.documentElement.style.setProperty("--dt-warning", colorTokens.warning);
document.documentElement.style.setProperty("--dt-warning-soft", colorTokens.warningSoft);
document.documentElement.style.setProperty("--dt-danger", colorTokens.danger);
document.documentElement.style.setProperty("--dt-danger-soft", colorTokens.dangerSoft);
document.documentElement.style.setProperty("--dt-font-sans", typographyTokens.fontFamily.sans);
document.documentElement.style.setProperty("--dt-font-serif", typographyTokens.fontFamily.serif);
document.documentElement.style.setProperty("--dt-radius-md", `${radiusTokens.md}px`);
document.documentElement.style.setProperty("--dt-radius-lg", `${radiusTokens.lg}px`);
document.documentElement.style.setProperty("--dt-radius-xl", `${radiusTokens.xl}px`);
document.documentElement.style.setProperty("--dt-shadow-card", elevationTokens.card);
document.documentElement.style.setProperty("--dt-shadow-floating", elevationTokens.floating);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
