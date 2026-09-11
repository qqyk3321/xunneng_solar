import styles from "./home-contact.module.css";
import { SITE_CONTACT } from "@/lib/site-contact";

export function SupportEmail() {
  return (
    <p className={styles.supportEmail}>
      Email us at{" "}
      <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
    </p>
  );
}
