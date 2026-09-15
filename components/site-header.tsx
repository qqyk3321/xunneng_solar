"use client";

import type { ReactNode } from "react";
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
}: {
  homeSectionsLocal?: boolean;
  accountSlot?: ReactNode;
}) {
  const { country } = useSiteRegion();
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
    <header
      className={`tailwind-scope ${styles.homepage} ${styles.header}`}
      data-testid="home-header"
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
        <nav className={styles.nav} aria-label="Main navigation">
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
      </div>
    </header>
  );
}
