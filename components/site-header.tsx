"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { SectionAnchor } from "./section-anchor";
import { RegionSwitcher, useSiteRegion } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import { BrandMark } from "./brand-mark";
import styles from "./demo-homepage.module.css";

/** Shared public navigation; only homepage sections use local anchors. */
export function SiteHeader({
  homeSectionsLocal = false,
  accountSlot,
  immersive = false,
}: {
  homeSectionsLocal?: boolean;
  accountSlot?: ReactNode;
  immersive?: boolean;
}) {
  const { country } = useSiteRegion();
  const [revealed, setRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!immersive) return;
    const scroll = () => {
      if (window.scrollY > 80) setRevealed(true);
    };
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, [immersive]);
  function homeLink(id: string, label: string) {
    return homeSectionsLocal ? (
      <SectionAnchor href={`#${id}`}>{label}</SectionAnchor>
    ) : (
      <Link href={`${regionPath(country)}#${id}`} prefetch={false}>
        {label}
      </Link>
    );
  }
  return (
    <>
      {immersive && !revealed && (
        <div
          className={styles.headerRevealZone}
          aria-hidden="true"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setRevealed(true);
          }}
        />
      )}
      <header
        className={`tailwind-scope ${styles.homepage} ${styles.header}`}
        data-testid="home-header"
        data-immersive-header={immersive || undefined}
        data-revealed={revealed || undefined}
        data-menu-open={menuOpen || undefined}
        onFocusCapture={() => {
          if (immersive) setRevealed(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setMenuOpen(false);
        }}
      >
        <div className={styles.headerInner}>
          <Link
            href={regionPath(country)}
            prefetch={false}
            className={styles.brand}
            aria-label="Sol & Tide Energy home"
          >
            <BrandMark />
            Sol<span>&</span>Tide <small>Energy</small>
          </Link>
          <nav
            id={immersive ? "regional-main-nav" : undefined}
            className={styles.nav}
            aria-label="Main navigation"
            onClick={() => setMenuOpen(false)}
          >
            {homeLink("calculator", "Savings")}
            {homeLink("benefits", "Why solar")}
            {homeLink("contact-us", "Contact us")}
            <Link href={regionPath(country, "/faq")} prefetch={false}>
              FAQ
            </Link>
          </nav>
          <div className={styles.headerActions}>
            <Link
              href={regionPath(country, "/faq")}
              prefetch={false}
              className={styles.mobileFaq}
            >
              FAQ
            </Link>
            <Link
              href={regionPath(country, "/consultation")}
              prefetch={false}
              className={styles.headerCta}
            >
              Get Your Free Assessment
            </Link>
            <RegionSwitcher />
            {accountSlot}
          </div>
          {immersive && (
            <button
              type="button"
              className={styles.menuToggle}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="regional-main-nav"
              onClick={() => {
                setRevealed(true);
                setMenuOpen((value) => !value);
              }}
            >
              <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}
