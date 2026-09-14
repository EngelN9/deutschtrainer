import type { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

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
    <div className="public-page-container">
      <PublicHeader />
      <main className="public-shell public-document-shell">
        <article className="public-document">
          <div className="public-document-header">
            <span className="public-eyebrow">{category}</span>
            <h1>{title}</h1>
            <p className="public-lead">{lead}</p>
          </div>
          <div className="public-document-body">{children}</div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}

