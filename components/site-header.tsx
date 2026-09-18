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
  caribbean = false,
}: {
  homeSectionsLocal?: boolean;
  accountSlot?: ReactNode;
  immersive?: boolean;
  caribbean?: boolean;
}) {
  const { country, choose } = useSiteRegion();
  const [revealed, setRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!immersive) return;
    const scroll = () => {
      if (window.scrollY > 80) setRevealed(true);
    };
    scroll();
    const revealTimer = window.setTimeout(() => setRevealed(true), 3000);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.clearTimeout(revealTimer);
      window.removeEventListener("scroll", scroll);
    };
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
        data-caribbean-header={caribbean || undefined}
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
            id={immersive || caribbean ? "regional-main-nav" : undefined}
            className={styles.nav}
            aria-label="Main navigation"
            onClick={() => setMenuOpen(false)}
          >
            {caribbean ? (
              <>
                <button
                  className={styles.navAction}
                  onClick={() => choose("savings")}
                  aria-haspopup="dialog"
                >
                  Savings
                </button>
                <SectionAnchor href="#journey">Our approach</SectionAnchor>
                <SectionAnchor href="#hybrid-system">Why solar</SectionAnchor>
              </>
            ) : (
              <>
                {homeLink("calculator", "Savings")}
                {homeLink("benefits", "Why solar")}
                {homeLink("contact-us", "Contact us")}
              </>
            )}
            <Link href={regionPath(country, "/faq")} prefetch={false}>
              FAQ
            </Link>
            {caribbean && (
              <button
                className={styles.mobileAssessment}
                onClick={() => choose("assessment")}
                aria-haspopup="dialog"
              >
                Get Your Free Assessment
              </button>
            )}
          </nav>
          <div className={styles.headerActions}>
            <Link
              href={regionPath(country, "/faq")}
              prefetch={false}
              className={styles.mobileFaq}
            >
              FAQ
            </Link>
            {caribbean ? (
              <button
                className={`${styles.headerCta} ${styles.tailoredCta}`}
                onClick={() => choose("assessment")}
                aria-haspopup="dialog"
                aria-label="Get Your Free Assessment"
              >
                Get Your Free Assessment
              </button>
            ) : (
              <Link
                href={regionPath(country, "/consultation")}
                prefetch={false}
                className={styles.headerCta}
              >
                Get Your Free Assessment
              </Link>
            )}
            {!caribbean && <RegionSwitcher />}
            {accountSlot}
          </div>
          {(immersive || caribbean) && (
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
