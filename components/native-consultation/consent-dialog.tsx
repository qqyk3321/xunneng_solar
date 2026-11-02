"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import styles from "./form.module.css";

export function PrivacyStatement() {
  return <>I agree to the <Link href="/privacy#native-consultation" target="_blank" rel="noopener noreferrer">privacy notice</Link> and to being contacted about this assessment.</>;
}

export function ConsentDialog({ accepted, onChange, onConfirm, onClose }: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const checkbox = useRef<HTMLInputElement>(null);
  const title = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    checkbox.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialog} className={styles.consentDialog} aria-labelledby={title}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href]")];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <button type="button" className={styles.dialogClose} aria-label="Close privacy confirmation" onClick={onClose}><X size={21} aria-hidden="true" /></button>
    <h2 id={title}>Confirm your consent</h2>
    <label className={styles.consent}>
      <input ref={checkbox} type="checkbox" checked={accepted} onChange={event => onChange(event.target.checked)} />
      <span><PrivacyStatement /></span>
    </label>
    <button type="button" className={styles.primary} onClick={onConfirm}>Agree and send</button>
  </dialog>;
}
