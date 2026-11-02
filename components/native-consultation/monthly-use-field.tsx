"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { RequiredMark } from "./required-mark";
import styles from "./form.module.css";

/** Shared by the first assessment and the result-page editor. */
export const MonthlyUseField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  function MonthlyUseField({ error, ...input }, ref) {
    return <div id="monthly-use" className={styles.kwh}>
      <div className={styles.kwhLabel}><label htmlFor="monthlyKwh" className={styles.questionTitle}><span className={styles.questionNumber} aria-hidden="true">01</span><span>Highest monthly electricity use<RequiredMark /></span></label></div>
      <div className={styles.kwhInput}><input {...input} ref={ref} id="monthlyKwh" type="text" required inputMode="decimal" maxLength={12} aria-invalid={!!error} aria-describedby={error ? "monthlyKwh-error" : undefined} /><span aria-hidden="true">kWh</span></div>
      {error && <p id="monthlyKwh-error" className={styles.error}>{error}</p>}
    </div>;
  },
);
