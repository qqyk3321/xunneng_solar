import type { CSSProperties } from "react";
import type { ConsultationEstimate } from "@/lib/quote-pricing/consultation-estimate";
import styles from "./preview.module.css";

const amount = (value: number, digits = 0) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function CurrentEstimate({ estimate }: { estimate: ConsultationEstimate }) {
  if (estimate.status !== "ready") return <section className={`${styles.card} ${styles.estimate}`} aria-labelledby="estimate-title" data-testid="preview-estimate-unavailable">
    <h2 id="estimate-title">Your preliminary quote</h2>
    <p>{estimate.status === "missing-inputs"
      ? "Electricity-use details are needed for a quote."
      : "Your quote is temporarily unavailable. Please try again."}</p>
  </section>;

  const quoteAmount = amount(estimate.quoteXcd);
  const savedAmount = amount(estimate.annualSavedKwh);
  // Keep longer prices on one line with their equally sized currency prefix.
  const quoteStyle = { "--quote-size": `${Math.min(17.3, 155.7 / (quoteAmount.length + 3))}cqi` } as CSSProperties;
  // Leave space for the unit when mobile displays both secondary metrics together.
  const savedStyle = { "--compact-size": `${Math.min(23, 130 / (savedAmount.length + 1))}cqi` } as CSSProperties;

  return <section className={styles.estimateReady} aria-label="Your preliminary quote" data-testid="preview-estimate">
    <dl className={styles.estimateMetrics}>
      <div className={styles.priceMetric} style={quoteStyle}>
        <dt>Project quote</dt>
        <dd data-testid="preview-quote">
          <span className={styles.srOnly}>Approximately </span><span className={styles.metricQualifier} aria-hidden="true">~</span>
          <span className={styles.metricAmount}><span className={styles.metricCurrency}>EC$</span><span className={styles.metricValue}>{quoteAmount}</span></span>
        </dd>
      </div>
      <div style={savedStyle}>
        <dt>Annual electricity saved</dt>
        <dd data-testid="preview-saved-kwh">
          <span className={styles.srOnly}>Approximately </span><span className={styles.metricQualifier} aria-hidden="true">~</span>
          <span className={styles.metricAmount}><span className={styles.metricValue}>{savedAmount}</span>{" "}<span className={styles.metricUnit}>kWh</span></span>
        </dd>
      </div>
      <div>
        <dt>Estimated payback</dt>
        <dd data-testid="preview-payback">{estimate.paybackYears === null ? "—" : <>
          <span className={styles.srOnly}>Approximately </span><span className={styles.metricQualifier} aria-hidden="true">~</span>
          <span className={styles.metricAmount}><span className={styles.metricValue}>{amount(estimate.paybackYears, 1)}</span>{" "}<span className={styles.metricUnit}>years</span></span>
        </>}</dd>
      </div>
    </dl>
  </section>;
}
