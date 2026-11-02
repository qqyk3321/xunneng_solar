"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./reference-value.module.css";

export function ReferenceValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const display = /^ST-[A-F0-9]{32}$/i.test(value)
    ? `${value.slice(0, 7)}…${value.slice(-4)}`
    : value;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (manualCopy) { input.current?.focus(); input.current?.select(); }
  }, [manualCopy]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setManualCopy(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setManualCopy(true);
      input.current?.focus();
      input.current?.select();
    }
  }

  return <div className={styles.reference}>
    <button type="button" className={styles.value} onClick={copy}
      aria-label="Copy full submission ID" title={value}>
      <span>{display}</span>
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
    </button>
    <span className={styles.srOnly} role="status">{copied ? "Submission ID copied." : ""}</span>
    {manualCopy && <div className={styles.manualCopy}>
      <p>Select and copy your submission ID.</p>
      <input ref={input} aria-label="Full submission ID" readOnly value={value} onFocus={event => event.currentTarget.select()} />
    </div>}
  </div>;
}
