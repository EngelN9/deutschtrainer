"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";

interface PublicHeaderProps {
  learnerWebUrl: string;
}

const navigationLinks = [
  { href: "/learn-german-b1-c2", label: "德語 B1–C2" },
  { href: "/ai-tutor", label: "AI 德語家教" },
  { href: "/virtual-classroom", label: "虛擬教室" },
  { href: "/status", label: "目前狀態" },
  { href: "/support", label: "支援" },
] as const;

const mobileDrawerId = "public-mobile-drawer";

export function PublicHeader({ learnerWebUrl }: PublicHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathnameRef = useRef(pathname);

  function closeMenu({ returnFocus = true }: { returnFocus?: boolean } = {}) {
    setMobileMenuOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    setMobileMenuOpen(false);
    requestAnimationFrame(() => document.getElementById("main-content")?.focus());
  }, [pathname]);

  function handleDrawerKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [],
    );
    const firstElement = focusableElements.at(0);
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }

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
          {navigationLinks.map((link) => {
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
          <a className="button button-primary header-cta-button" href={learnerWebUrl}>
            <span>進入學習系統</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileDrawerId}
            aria-label="開啟選單"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div
          className="public-mobile-layer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMenu();
            }
          }}
        >
          <div
            ref={drawerRef}
            id={mobileDrawerId}
            className="public-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-mobile-menu-title"
            onKeyDown={handleDrawerKeyDown}
          >
            <div className="public-mobile-heading">
              <strong id="public-mobile-menu-title">導覽選單</strong>
              <button
                type="button"
                className="mobile-menu-close"
                onClick={() => closeMenu()}
                aria-label="關閉選單"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <nav className="public-nav-mobile" aria-label="行動版選單連結">
              {navigationLinks.map((link) => {
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
              <a className="button button-primary mobile-cta-button" href={learnerWebUrl}>
                <span>進入學習系統</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
