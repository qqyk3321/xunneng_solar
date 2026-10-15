"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-contact";
import styles from "./contact-actions.module.css";

export function SubmissionContactActions({
  previewUrl, previewQrSrc, whatsappUrl, whatsappQrSrc,
}: { previewUrl: string; previewQrSrc: string; whatsappUrl: string; whatsappQrSrc: string }) {
  const [busy, setBusy] = useState(false);
  const sharing = useRef(false);
  const [status, setStatus] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const [expandedQr, setExpandedQr] = useState<"whatsapp" | "quote" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useId();
  const qrOptions = [
    { id: "whatsapp" as const, src: whatsappQrSrc, alt: "Scan to discuss this quote on WhatsApp", label: "Chat on WhatsApp" },
    { id: "quote" as const, src: previewQrSrc, alt: "Scan to view this quote on your phone", label: "Open this quote" },
  ];
  const selectedQr = qrOptions.find(option => option.id === expandedQr);

  useEffect(() => {
    if (!expandedQr || !dialog.current) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [expandedQr]);

  async function share() {
    if (sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setStatus("");
    setManualCopy(false);
    try {
      if (typeof navigator.share === "function") {
        try {
          // Invoke within the click's user activation, before any asynchronous work.
          await navigator.share({ title: "My preliminary quote | Sol & Tide", url: previewUrl });
          return;
        } catch (error) {
          // Closing the share sheet is normal, and must not copy anything.
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(previewUrl);
        setStatus("Link copied. You can paste it into a message.");
      } catch {
        setManualCopy(true);
        setStatus("Select and copy your quote link below.");
      }
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  }

  return <section className={styles.contact} aria-labelledby="quote-contact-title">
    <h2 id="quote-contact-title">Questions about your quote?</h2>
    <div className={styles.actions}>
      <a className={styles.whatsapp} href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Discuss on WhatsApp">
        <WhatsAppIcon /> <span><span className={styles.actionIntro}>Discuss on </span>WhatsApp</span> <span className={styles.actionArrow} aria-hidden="true">↗</span>
      </a>
      <button type="button" className={styles.share} onClick={share} disabled={busy}>
        <Share2 size={18} aria-hidden="true" /> {busy ? "Opening…" : "Share quote"}
      </button>
    </div>
    <p className={styles.status} role="status">{status}</p>
    {manualCopy && <label className={styles.manualCopy}>
      Quote link
      <input aria-label="Quote link" readOnly value={previewUrl} onFocus={event => event.currentTarget.select()} />
    </label>}
    <div className={styles.desktopQr}>
      <div className={styles.qrOptions}>
        {qrOptions.map(option => <figure key={option.id}>
          <button
            type="button"
            className={styles.qrButton}
            aria-label={`Enlarge QR code: ${option.label}`}
            aria-haspopup="dialog"
            onClick={() => setExpandedQr(option.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={option.src} alt={option.alt} width="124" height="124" />
          </button>
          <figcaption>{option.label}</figcaption>
        </figure>)}
      </div>
    </div>
    <dialog
      ref={dialog}
      className={styles.qrDialog}
      aria-labelledby={dialogTitle}
      onCancel={event => { event.preventDefault(); setExpandedQr(null); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          setExpandedQr(null);
        }
      }}
    >
      <button type="button" className={styles.close} onClick={() => setExpandedQr(null)} aria-label="Close QR code">
        <X size={22} aria-hidden="true" />
      </button>
      <h2 id={dialogTitle}>{selectedQr?.label}</h2>
      {selectedQr && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedQr.src} alt={selectedQr.alt} width="320" height="320" />
        <p>Scan with your phone’s camera.</p>
      </>}
    </dialog>
  </section>;
}
