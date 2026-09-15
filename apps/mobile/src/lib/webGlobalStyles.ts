import { colorTokens, typographyTokens } from "@deutschtrainer/ui";

const STYLE_ID = "dt-global-styles";

// Without this, the page body falls back to Times New Roman and keyboard focus uses the browser's
// default outline, which measured 2.40:1 against the background (WCAG needs 3:1).
const globalCss = `
body {
  background-color: ${colorTokens.background};
  color: ${colorTokens.text};
  font-family: ${typographyTokens.fontFamily.sans};
}
:focus-visible {
  outline: 2px solid ${colorTokens.focusRing} !important;
  outline-offset: 2px !important;
}
`;

export function installWebGlobalStyles(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = globalCss;
  document.head.appendChild(style);
}
