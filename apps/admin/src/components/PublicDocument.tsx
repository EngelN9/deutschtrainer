import type { ReactNode } from "react";
import { PublicShell } from "./PublicShell";

export function PublicDocument({
  title,
  lead,
  category = "DeutschTrainer 平台資訊",
  children,
}: {
  title: string;
  lead: string;
  category?: string;
  children: ReactNode;
}) {
  return (
    <PublicShell className="public-document-shell">
      <article className="public-document">
        <header className="public-document-header">
          <p className="public-eyebrow">{category}</p>
          <h1>{title}</h1>
          <p className="public-lead">{lead}</p>
        </header>
        <div className="public-document-body">{children}</div>
      </article>
    </PublicShell>
  );
}
