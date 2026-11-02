"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { RequiredMark } from "./required-mark";
import styles from "./form.module.css";

export const AddressField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }>(
  function AddressField({ error, ...input }, ref) {
    return <div className={styles.field}>
      <label htmlFor="address">Installation address<RequiredMark /></label>
      <textarea {...input} ref={ref} id="address" required rows={2} autoComplete="street-address" placeholder="Street, area and landmarks" maxLength={1200} aria-invalid={!!error} aria-describedby={error ? "address-error" : undefined} />
      {error && <p id="address-error" className={styles.error}>{error}</p>}
    </div>;
  },
);
