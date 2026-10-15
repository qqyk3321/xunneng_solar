"use client";

import Link from "next/link";
import { RegionFlag, RegionSwitcher, useSiteRegion } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import { BrandMark } from "./brand-mark";
import { PrivacyLink } from "./privacy-link";
import { SocialIcons } from "./facebook-contact";
import { HomePrivacyNotice } from "./home-privacy-notice";
import { RegionalSupportLink } from "./support-email";
import styles from "./site-footer.module.css";

export function SiteFooter({
  caribbean = false,
}: { caribbean?: boolean } = {}) {
  const { country: selectedCountry, choose } = useSiteRegion();
  const country = caribbean ? null : selectedCountry;
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
              {country && (
                <>
                  <br />
                  {country === "DM"
                    ? "Serving homes in Dominica."
                    : "Serving homes in Antigua."}
                </>
              )}
            </p>
            <div className={styles.contactArea}>
              {caribbean ? (
                <div className={styles.countryLinks}>
                  <Link href="/antigua" prefetch={false}>
                    <RegionFlag country="AG" /> Antigua &amp; Barbuda
                  </Link>
                  <Link href="/dominica" prefetch={false}>
                    <RegionFlag country="DM" /> Dominica
                  </Link>
                </div>
              ) : (
                <>
                  <RegionSwitcher
                    variant="text"
                    className={styles.locationSelector}
                  />
                  <address className={styles.contacts}>
                    <RegionalSupportLink />
                  </address>
                </>
              )}
              <SocialIcons />
            </div>
          </div>
          <div className={styles.middle}>
            <h2 className={styles.sectionTitle}>Explore</h2>
            <nav className={styles.links} aria-label="Footer navigation">
              {caribbean ? (
                <button type="button" onClick={() => choose("how-it-works")} aria-haspopup="dialog">
                  How it works
                </button>
              ) : (
                <Link href={regionPath(country, "/how-it-works")} prefetch={false}>
                  How it works
                </Link>
              )}
              {caribbean ? (
                <button
                  type="button"
                  onClick={() => choose("faq")}
                  aria-haspopup="dialog"
                >
                  FAQ
                </button>
              ) : (
                <Link href={regionPath(country, "/faq")} prefetch={false}>
                  FAQ
                </Link>
              )}
              {caribbean ? (
                <button
                  type="button"
                  onClick={() => choose("savings")}
                  aria-haspopup="dialog"
                >
                  Explore your savings
                </button>
              ) : (
                <Link
                  href={`${regionPath(country)}#calculator`}
                  prefetch={false}
                >
                  Explore your savings
                </Link>
              )}
              {caribbean ? (
                <Link href="/#journey">Our approach</Link>
              ) : (
                <Link
                  href={`${regionPath(country)}#contact-us`}
                  prefetch={false}
                >
                  Contact us
                </Link>
              )}
              <PrivacyLink />
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
            {caribbean ? (
              <button
                type="button"
                className={styles.assessment}
                onClick={() => choose("assessment")}
                aria-haspopup="dialog"
              >
                Get Your Free Assessment
              </button>
            ) : (
              <Link
                href={regionPath(country, "/consultation")}
                prefetch={false}
                className={styles.assessment}
              >
                Get Your Free Assessment
              </Link>
            )}
          </div>
        </div>
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Sol &amp; Tide Energy. All rights
            reserved.
          </p>
          <span className={styles.signature}>
            <Link href="/" prefetch={false}>Solortide</Link>
            {" — solar & storage built around your home."}
          </span>
        </div>
      </div>
    </footer>
  );
}
