"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

interface PublicHeaderProps {
  learnerWebUrl?: string;
}

const NAV_LINKS = [
  { href: "/learn-german-b1-c2", label: "德語 B1–C2" },
  { href: "/ai-tutor", label: "AI 德語家教" },
  { href: "/virtual-classroom", label: "虛擬教室" },
  { href: "/status", label: "目前狀態" },
  { href: "/support", label: "支援" },
];

export function PublicHeader({
  learnerWebUrl = process.env.NEXT_PUBLIC_LEARNER_WEB_URL?.trim() || "https://deutschtrainer-engeln9-web.onrender.com",
}: PublicHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle escape key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link className="public-brand" href="/" aria-label="DeutschTrainer AI 首頁">
          <span className="brand-mark small" aria-hidden="true">
            DT
          </span>
          <span className="brand-text">
            <strong>DeutschTrainer AI</strong>
            <small>德語 B1–C2 繁中學習平台</small>
          </span>
        </Link>

        <nav className="public-nav-desktop" aria-label="主要導覽">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`public-nav-link ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="public-header-actions">
          <a
            className="button button-primary header-cta-button"
            href={learnerWebUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span>進入學習系統</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "關閉選單" : "開啟選單"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen ? (
        <div className="public-mobile-drawer" role="dialog" aria-modal="true" aria-label="行動版導覽選單">
          <nav className="public-nav-mobile" aria-label="行動版選單連結">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`public-mobile-link ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="public-mobile-cta">
              <a
                className="button button-primary mobile-cta-button"
                href={learnerWebUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>進入學習系統</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
