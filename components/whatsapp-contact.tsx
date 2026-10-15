"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SocialBrandIcon } from "./social-brand-icon";
import { SITE_CONTACT } from "@/lib/site-contact";
import { CONTACT_COPY } from "@/lib/contact-copy";
import styles from "./whatsapp-contact.module.css";

type ConsultationContact = { url: string; qrSrc: string; submissionId: string };
const ConsultationContactContext = createContext<ConsultationContact | null>(null);

/** Keep footer and floating contact links tied to the quote being viewed. */
export function ConsultationContactProvider({ value, children }: { value: ConsultationContact; children: ReactNode }) {
  return <ConsultationContactContext.Provider value={value}>{children}</ConsultationContactContext.Provider>;
}

export function WhatsAppIcon({ brand = false }: { brand?: boolean } = {}) {
  if (brand) return <SocialBrandIcon brand="whatsapp" />;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.5L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.6Z" />
      <path d="m8.2 7.1 1.5 2.6-1 1.1a7.7 7.7 0 0 0 4.5 4.1l1-1.2 2.6 1.3c-.3 1.6-1.4 2.1-2.7 1.8-4.2-.9-7.2-4-7.4-7.1-.1-1.2.5-2.2 1.5-2.6Z" />
    </svg>
  );
}

export function WhatsAppDialog({
  open,
  onClose,
  onMessage,
  qrOnly = false,
  compact = false,
}: {
  open: boolean;
  onClose: () => void;
  onMessage?: () => void;
  qrOnly?: boolean;
  compact?: boolean;
}) {
  const consultation = useContext(ConsultationContactContext);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [open]);
  function close() {
    dialog.current?.close();
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-consultation={consultation ? true : undefined}
      data-qr-zoom={qrOnly || undefined}
      data-compact={compact || undefined}
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }
      }}
    >
      <button
        type="button"
        className={styles.close}
        onClick={close}
        aria-label="Close contact options"
      >
        ×
      </button>
      {!qrOnly && !compact && <div className={styles.mark}>
        <WhatsAppIcon />
      </div>}
      <h2 id={title}>{qrOnly ? "WhatsApp QR code" : compact ? CONTACT_COPY.contact.title : consultation ? "Let’s discuss your quote." : "Let’s talk about your home."}</h2>
      {!qrOnly && <>
      {!compact && <p>{consultation ? `Your message includes Submission ID: ${consultation.submissionId}` : "One team. Every island. Connect with Sol & Tide on WhatsApp."}</p>}
      <a
        className={styles.primary}
        href={consultation?.url || SITE_CONTACT.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon /> Chat on WhatsApp
      </a>
      </>}
      <div className={styles.scan}>
        {/* Locally generated PNG: no third-party widget or tracking script. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={consultation?.qrSrc || "/contact/whatsapp-qr.png"}
          width="240"
          height="240"
          alt="Scan to chat with Sol & Tide on WhatsApp"
        />
        {!compact && <>
          <strong>Scan to start a conversation</strong>
          <span>{consultation ? `+${new URL(consultation.url).pathname.slice(1)}` : SITE_CONTACT.whatsappNumber}</span>
        </>}
      </div>
      {onMessage && (
        <button
          type="button"
          className={styles.message}
          onClick={() => {
            close();
            // Let the modal close and restore focus before opening the message editor.
            requestAnimationFrame(onMessage);
          }}
        >
          Prefer email? Leave a message
        </button>
      )}
    </dialog>
  );
}

export function WhatsAppContact({
  dark = false,
  iconOnly = false,
  linkOnly = false,
  inlineQr = false,
  showMobileQr = true,
  children,
}: {
  dark?: boolean;
  iconOnly?: boolean;
  linkOnly?: boolean;
  inlineQr?: boolean;
  showMobileQr?: boolean;
  children?: ReactNode;
}) {
  const consultation = useContext(ConsultationContactContext);
  const [open, setOpen] = useState(false);
  if (iconOnly || linkOnly) {
    return (
      <a
        href={consultation?.url || SITE_CONTACT.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Solortide on WhatsApp"
        title="WhatsApp"
      >
        <WhatsAppIcon brand={linkOnly} />
        {linkOnly && <span>Chat on WhatsApp</span>}
      </a>
    );
  }
  return (
    <div
      className={styles.contact}
      data-dark={dark || undefined}
      data-inline-qr={inlineQr || undefined}
      data-mobile-qr={showMobileQr ? undefined : "hidden"}
      data-consultation={consultation ? true : undefined}
    >
      {inlineQr && (
        <figure className={styles.footerQr}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={consultation?.qrSrc || "/contact/whatsapp-qr.png"}
            width="140"
            height="140"
            alt="Scan to chat with Sol & Tide on WhatsApp"
            loading="lazy"
          />
        </figure>
      )}
      {children && <div className={styles.footerNumber}>{children}</div>}
      <a
        className={styles.link}
        href={consultation?.url || SITE_CONTACT.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon /> Chat on WhatsApp
      </a>
      <button
        type="button"
        className={styles.qrButton}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Scan QR code
      </button>
      <WhatsAppDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
