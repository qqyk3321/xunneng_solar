"use client";

import { useState } from "react";
import { InstagramContact } from "./instagram-contact";
import { Mail } from "lucide-react";
import { SITE_CONTACT } from "@/lib/site-contact";
import { FacebookIcon, MessengerIcon } from "./facebook-contact";
import { RegionalSupportLink } from "./support-email";
import { WhatsAppDialog, WhatsAppIcon } from "./whatsapp-contact";
import styles from "./home-contact-methods.module.css";

export function HomeContactMethods() {
  const [qrOpen, setQrOpen] = useState(false);
  return (
    <>
      <WhatsAppDialog open={qrOpen} onClose={() => setQrOpen(false)} qrOnly />
      <div className={styles.methods}>
        <nav className={styles.links} aria-label="Contact Solortide">
          <div className={styles.email}>
            <Mail size={20} aria-hidden="true" />
            <RegionalSupportLink />
          </div>
          <a href={SITE_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon brand />
            <span>Chat on WhatsApp</span>
          </a>
          <a href={SITE_CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer">
            <FacebookIcon size={20} />
            <span>Follow us on Facebook</span>
          </a>
          <a href={SITE_CONTACT.messengerUrl} target="_blank" rel="noopener noreferrer">
            <MessengerIcon />
            <span>Message us on Messenger</span>
          </a>
          <InstagramContact />
        </nav>
        <button
          type="button"
          className={styles.qrCard}
          onClick={() => setQrOpen(true)}
          aria-label="Enlarge WhatsApp QR code"
          aria-haspopup="dialog"
        >
          <span className={styles.qrLabel}>
            <WhatsAppIcon brand />
            <span>WhatsApp</span>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- Existing local contact QR. */}
          <img
            className={styles.qr}
            src="/contact/whatsapp-qr.png"
            width="144"
            height="144"
            alt="Scan to chat with Sol & Tide on WhatsApp"
            loading="lazy"
          />
        </button>
      </div>
    </>
  );
}
