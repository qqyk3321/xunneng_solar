"use client";

import { useEffect, useId, useRef, useState } from "react";
import { tariffReference } from "@/lib/antigua-calculator/tariff-reference";
import styles from "./electricity-tariff-help.module.css";

export function ElectricityTariffHelp({ country, context }: { country: "AG" | "DM"; context: "calculator" | "quote" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const reference = tariffReference(country);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  return <span ref={root} className={styles.root}
    onPointerEnter={event => { if (event.pointerType === "mouse") setOpen(true); }}
    onPointerLeave={event => { if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setOpen(false); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => { if (event.key === "Escape") { button.current?.focus(); setOpen(false); } }}>
    <button ref={button} type="button" className={styles.button} aria-label="About the electricity tariff" aria-expanded={open} aria-controls={open ? id : undefined}
      onFocus={() => setOpen(true)} onClick={() => setOpen(true)}>?</button>
    {open && <span id={id} role="region" aria-label="Tariff sources and assumptions" className={styles.panel}>
      <strong>{reference.title}</strong>
      <span>{reference.description}</span>
      <span>{reference.caveat}</span>
      {context === "calculator"
        ? <span>Savings assume an 80% bill reduction. System size, investment and payback use our planning assumptions, not a utility forecast or quotation.</span>
        : <span>Payback = project quote ÷ estimated annual bill savings, comparing monthly grid bills before and after solar. Future tariff changes, export payments, maintenance, financing and battery replacement are excluded.</span>}
      {reference.sources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a>)}
      <button type="button" className={styles.close} onClick={() => { button.current?.focus(); setOpen(false); }}>Close</button>
    </span>}
  </span>;
}
