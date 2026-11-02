"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { Check, X } from "lucide-react";
import type { Country } from "@solortide/consultation-core";
import { regionPath } from "@/lib/site-region-routing";
import styles from "./success-dialog.module.css";

export function SuccessDialog({ country }: { country: Country }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const title = useId(), description = useId(), homePath = regionPath(country);
  const returnHome = () => router.push(homePath);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    element.showModal(); heading.current?.focus({ preventScroll: true }); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} aria-describedby={description}
    onCancel={event => { event.preventDefault(); returnHome(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button, a[href]")];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <button type="button" className={styles.close} aria-label="Close and return home" onClick={returnHome}><X size={19} aria-hidden="true" /></button>
    <div className={styles.mark} aria-hidden="true"><Check size={23} strokeWidth={2} /></div>
    <h2 id={title} ref={heading} tabIndex={-1}>Assessment submitted</h2>
    <p id={description}>Please check your email to view your assessment.</p>
    <Link href={homePath} className={styles.home}>Back to home</Link>
  </dialog>;
}
