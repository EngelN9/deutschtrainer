import Link from "next/link";
import type { ReactNode } from "react";
import { GitBranch, Menu } from "lucide-react";

const productLinks = [
  { href: "/features", label: "功能與程度" },
  { href: "/features#android", label: "Android 測試版" },
  { href: "/support", label: "支援" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-site">
      <header className="site-header">
        <div className="site-container header-inner">
          <Link className="site-brand" href="/" aria-label="DeutschTrainer 首頁">
            <span className="site-brand-mark" aria-hidden="true">
              DT
            </span>
            <span>
              <strong>DeutschTrainer</strong>
              <small>B1–C2</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="主要導覽">
            {productLinks.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <a
              className="github-link"
              href="https://github.com/EngelN9/deutschtrainer"
              aria-label="DeutschTrainer GitHub"
            >
              <GitBranch size={19} aria-hidden="true" />
            </a>
            <Link className="admin-link" href="/admin">
              內容團隊登入
            </Link>
            <details className="mobile-nav">
              <summary aria-label="開啟導覽">
                <Menu size={22} aria-hidden="true" />
              </summary>
              <nav aria-label="行動版導覽">
                {productLinks.map((link) => (
                  <Link href={link.href} key={link.href}>
                    {link.label}
                  </Link>
                ))}
                <Link href="/admin">內容團隊登入</Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  );
}

export function PublicPage({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <PublicShell>
      <main className="public-page">
        <header className="page-hero">
          <div className="site-container narrow">
            <p className="site-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p>{intro}</p>
          </div>
        </header>
        <div className="site-container narrow page-body">{children}</div>
      </main>
    </PublicShell>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div className="footer-about">
          <Link className="site-brand footer-brand" href="/">
            <span className="site-brand-mark" aria-hidden="true">
              DT
            </span>
            <span>
              <strong>DeutschTrainer</strong>
              <small>德語 B1–C2 AI 自學 App</small>
            </span>
          </Link>
          <p>給繁體中文學習者的嚴謹德語練習系統。</p>
        </div>
        <div>
          <strong>產品</strong>
          <Link href="/features">功能與程度</Link>
          <a href="https://github.com/EngelN9/deutschtrainer/releases">Android 測試版</a>
          <a href="https://github.com/EngelN9/deutschtrainer">GitHub</a>
        </div>
        <div>
          <strong>支援</strong>
          <Link href="/support">取得協助</Link>
          <Link href="/account-deletion">刪除帳號</Link>
          <Link href="/admin">內容團隊登入</Link>
        </div>
        <div>
          <strong>法律</strong>
          <Link href="/privacy">隱私權政策</Link>
          <Link href="/terms">服務條款</Link>
        </div>
      </div>
      <div className="site-container footer-bottom">
        <span>© 2026 DeutschTrainer</span>
        <span>目前為公開驗收階段，不提供付款或訂閱。</span>
      </div>
    </footer>
  );
}
