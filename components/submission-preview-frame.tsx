"use client";

import { useEffect, useState } from "react";
import styles from "./submission-preview-frame.module.css";

export function SubmissionPreviewFrame({ previewUrl }: { previewUrl: string }) {
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [loading, attempt]);
  return (
    <section className={styles.record} aria-label="Your submitted consultation">
      <div className={styles.toolbar}>
        <h2>Your submitted details</h2>
      </div>
      {slow && loading && (
        <div className={styles.slow} role="status">
          <p>
            The preview is taking a little longer. Please try reloading it.
          </p>
          <button
            type="button"
            onClick={() => {
              setSlow(false);
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            Reload preview
          </button>
        </div>
      )}
      <div className={styles.frameWrap}>
        {loading && !slow && (
          <div className={styles.loading} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <h3>Loading your consultation…</h3>
            <p>Your submitted details will appear here shortly.</p>
            <div className={styles.skeleton} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        <iframe
          key={`${previewUrl}-${attempt}`}
          src={previewUrl}
          title="Consultation record preview"
          className={styles.frame}
          data-pending={(loading && !slow) || undefined}
          referrerPolicy="no-referrer"
          aria-hidden={(loading && !slow) || undefined}
          tabIndex={loading && !slow ? -1 : 0}
          onLoad={() => {
            setLoading(false);
            setSlow(false);
          }}
        />
      </div>
    </section>
  );
}
