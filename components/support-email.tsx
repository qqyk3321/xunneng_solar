"use client";

import styles from "./home-contact.module.css";
import { supportEmail } from "@/lib/site-contact";
import { useSiteRegion } from "./site-region";

export function RegionalSupportLink() {
  const { country, choose } = useSiteRegion();
  const email = supportEmail(country);
  return email ? (
    <a href={`mailto:${email}`}>{email}</a>
  ) : (
    <button
      type="button"
      onClick={() => choose()}
      style={{
        color: "inherit",
        font: "inherit",
        textDecoration: "underline",
        background: "none",
        border: 0,
        padding: 0,
        cursor: "pointer",
      }}
    >
      Choose your location to contact support
    </button>
  );
}

export function SupportEmail() {
  const { country } = useSiteRegion();
  return (
    <p className={styles.supportEmail}>
      {country && "Email us at "}
      <RegionalSupportLink />
    </p>
  );
}
