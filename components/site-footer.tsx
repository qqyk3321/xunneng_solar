"use client";

import Link from "next/link";
import packageJson from "@/package.json";
import { SITE_CONTACT } from "@/lib/site-contact";
import { RegionSwitcher, useSiteRegion } from "./site-region";
import { BrandMark } from "./brand-mark";
import { HomePrivacyNotice } from "./home-privacy-notice";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const { country } = useSiteRegion();
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div>
            <Link
              href="/"
              prefetch={false}
              className={styles.brand}
              aria-label="Sol & Tide Energy home"
            >
              <BrandMark />
              Sol<span>&</span>Tide <small>Energy</small>
            </Link>
            <p className={styles.description}>
              Solar and battery storage for Caribbean homes.
              <br />
              {country === "DM" ? "Serving homes in Dominica." : country === "AG" ? "Serving homes in Antigua." : "Currently serving Antigua and Dominica."}
            </p>
          </div>
          <div>
            <h2>Get in touch</h2>
            <address className={styles.contacts}>
              <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
              <a href={SITE_CONTACT.phoneHref}>{SITE_CONTACT.phone}</a>
              {country !== "DM" && <span>{SITE_CONTACT.address}</span>}
            </address>
          </div>
          <nav className={styles.links} aria-label="Footer navigation">
            <h2>Explore</h2>
            <Link href="/faq" prefetch={false}>
              FAQ
            </Link>
            <Link href="/#calculator" prefetch={false}>
              Explore your savings
            </Link>
            <Link href="/#contact-us" prefetch={false}>
              Contact us
            </Link>
            <Link href="/privacy" prefetch={false}>
              Privacy policy
            </Link>
            <RegionSwitcher />
            <HomePrivacyNotice />
          </nav>
        </div>
        <div className={styles.bottom}>
          <div>
            <p>
              © {new Date().getFullYear()} Sol &amp; Tide Energy. All rights
              reserved.
            </p>
            <span>Version {packageJson.version}</span>
          </div>
          <Link
            href="/consultation"
            prefetch={false}
            className={styles.assessment}
          >
            Get Your Free Assessment <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
