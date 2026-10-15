import { SITE_CONTACT } from "@/lib/site-contact";
import { InstagramContact } from "./instagram-contact";
import { SocialBrandIcon } from "./social-brand-icon";
import { WhatsAppContact } from "./whatsapp-contact";
import styles from "./facebook-contact.module.css";

export function FacebookIcon({ size = 22 }: { size?: number }) {
  return <SocialBrandIcon brand="facebook" size={size} />;
}

export function MessengerIcon() {
  return <SocialBrandIcon brand="messenger" />;
}

export function SocialIcons() {
  return (
    <nav className={`${styles.links} ${styles.icons} ${styles.dark}`} aria-label="Social media">
      <WhatsAppContact linkOnly />
      <a href={SITE_CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Solortide on Facebook" title="Facebook">
        <FacebookIcon size={18} />
      </a>
      <a href={SITE_CONTACT.messengerUrl} target="_blank" rel="noopener noreferrer" aria-label="Message Solortide on Messenger" title="Messenger">
        <MessengerIcon />
      </a>
      <InstagramContact iconOnly />
    </nav>
  );
}

export function FacebookContact({ dark = false }: { dark?: boolean }) {
  return (
    <nav
      className={`${styles.links} ${dark ? styles.dark : ""}`}
      aria-label="Connect with Solortide on Facebook"
    >
      <a
        href={SITE_CONTACT.facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FacebookIcon size={20} />
        <span>Follow us on Facebook</span>
      </a>
      <a
        href={SITE_CONTACT.messengerUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessengerIcon />
        <span>Message us on Messenger</span>
      </a>
    </nav>
  );
}
