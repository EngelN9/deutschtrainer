import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { colorTokens } from "@deutschtrainer/ui";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Classroom root element is missing.");

document.documentElement.style.setProperty("--dt-primary", colorTokens.primary);
document.documentElement.style.setProperty("--dt-background", colorTokens.background);
document.documentElement.style.setProperty("--dt-surface", colorTokens.surface);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
