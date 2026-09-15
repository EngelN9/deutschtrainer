import { cssTokens } from "@deutschtrainer/ui/css-tokens";
import type { CSSProperties, ReactNode } from "react";
import { getLearnerWebUrl } from "../lib/learnerWebUrl";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

type PublicThemeStyle = CSSProperties & Record<`--${string}`, string>;

const publicThemeStyle: PublicThemeStyle = cssTokens;

export function PublicShell({ children, className }: { children: ReactNode; className?: string }) {
  const mainClassName = ["public-shell", className].filter(Boolean).join(" ");

  return (
    <div className="public-page-container" style={publicThemeStyle}>
      <a className="skip-link" href="#main-content">
        跳到主要內容
      </a>
      <PublicHeader learnerWebUrl={getLearnerWebUrl()} />
      <main id="main-content" className={mainClassName} tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
