import Link from "next/link";
import type { ReactNode } from "react";

export function PublicDocument({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <main className="public-shell public-document-shell">
      <nav className="public-nav" aria-label="公開網站導覽">
        <Link className="public-brand" href="/">
          <span className="brand-mark small" aria-hidden="true">
            DT
          </span>
          <span>
            DeutschTrainer
            <small>Support & legal</small>
          </span>
        </Link>
        <div>
          <Link href="/status">狀態</Link>
          <Link href="/support">支援</Link>
          <Link href="/privacy">隱私</Link>
          <Link href="/terms">服務條款</Link>
        </div>
      </nav>
      <article className="public-document">
        <p className="public-eyebrow">DeutschTrainer</p>
        <h1>{title}</h1>
        <p className="public-lead">{lead}</p>
        {children}
      </article>
    </main>
  );
}
