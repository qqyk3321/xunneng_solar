import type { ReactNode } from "react";
import styles from "./form.module.css";
export function AssessmentCard({step,children}:{step:0|1;children:ReactNode}) {
 return <div className={styles.formCard} data-assessment-card="true">
      <header className={styles.progressHeader}>
        <div className={styles.progressLabel}><p className={styles.formTitle}>Solar assessment</p><span aria-live="polite">Page {step + 1} of 2</span></div>
        <div className={styles.progressTrack} role="progressbar" aria-label="Assessment pages" aria-valuemin={0} aria-valuemax={2} aria-valuenow={step + 1} aria-valuetext={`Page ${step + 1} of 2`}>
          <span style={{ width: step === 1 ? "100%" : "50%" }} />
        </div>
      </header>
      <div className={styles.content}>{children}</div></div>;
}
