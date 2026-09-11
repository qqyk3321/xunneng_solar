import type { ReactNode } from "react";
import Link from "next/link";
import { SectionAnchor } from "./section-anchor";
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
  function homeLink(id: string, label: string) {
    return homeSectionsLocal ? (
      <SectionAnchor href={`#${id}`}>{label}</SectionAnchor>
    ) : (
      <Link href={`/#${id}`} prefetch={false}>
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
          href="/"
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
          <Link href="/faq" prefetch={false}>
            FAQ
          </Link>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/faq" prefetch={false} className={styles.mobileFaq}>
            FAQ
          </Link>
          <Link
            href="/consultation"
            prefetch={false}
            className={styles.headerCta}
          >
            Get Your Free Assessment
          </Link>
          {accountSlot}
        </div>
      </div>
    </header>
  );
}
