"use client";

import Link from "next/link";
import { SITE_CONTACT } from "@/lib/site-contact";
import { RegionSwitcher, useSiteRegion } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import { BrandMark } from "./brand-mark";
import { HomePrivacyNotice } from "./home-privacy-notice";
import { RegionalSupportLink } from "./support-email";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const { country } = useSiteRegion();
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.identity}>
            <Link
              href={regionPath(country)}
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
              {country === "DM"
                ? "Serving homes in Dominica."
                : country === "AG"
                  ? "Serving homes in Antigua."
                  : "Currently serving Antigua and Dominica."}
            </p>
            <p className={styles.contactLabel}>Regional support</p>
            <address className={styles.contacts}>
              <RegionalSupportLink />
              {SITE_CONTACT.showMockContacts && (
                <a href={SITE_CONTACT.phoneHref}>{SITE_CONTACT.phone}</a>
              )}
              {SITE_CONTACT.showMockContacts && country !== "DM" && (
                <span>{SITE_CONTACT.address}</span>
              )}
            </address>
            <div className={styles.location}>
              <RegionSwitcher
                variant="text"
                className={styles.locationSelector}
              />
            </div>
          </div>
          <div className={styles.middle}>
            <h2 className={styles.sectionTitle}>Explore</h2>
            <nav className={styles.links} aria-label="Footer navigation">
              <Link href={regionPath(country, "/faq")} prefetch={false}>
                FAQ
              </Link>
              <Link href={`${regionPath(country)}#calculator`} prefetch={false}>
                Explore your savings
              </Link>
              <Link href={`${regionPath(country)}#contact-us`} prefetch={false}>
                Contact us
              </Link>
              <Link href={regionPath(country, "/privacy")} prefetch={false}>
                Privacy policy
              </Link>
            </nav>
            <div className={styles.settings}>
              <HomePrivacyNotice />
            </div>
          </div>
          <div className={styles.invitation}>
            <h2>
              Ready for your <br />
              next step?
            </h2>
            <p>Let’s explore solar and battery storage for your home.</p>
            <Link
              href={regionPath(country, "/consultation")}
              prefetch={false}
              className={styles.assessment}
            >
              Get Your Free Assessment <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Sol &amp; Tide Energy. All rights
            reserved.
          </p>
          <span className={styles.signature}>
            Solar &amp; storage. Built around your home.
          </span>
        </div>
      </div>
    </footer>
  );
}
