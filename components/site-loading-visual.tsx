import type { ReactNode } from "react";
import styles from "./site-loading.module.css";

export function SiteLoadingVisual({ fallback = false, embedded = false, label = "Loading page", caption = "Preparing your energy experience", children }: {
  fallback?: boolean; embedded?: boolean; label?: string; caption?: string; children?: ReactNode;
}) {
  return (
    <div
      className={embedded ? styles.embedded : fallback ? styles.fallback : styles.overlay}
      role="status"
      aria-live="polite"
      aria-label={label}
      data-nosnippet
      data-route-loading={fallback && !embedded ? "true" : undefined}
      data-site-loader={!fallback && !embedded ? "true" : undefined}
      data-embedded-loader={embedded ? "true" : undefined}
    >
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.brand}>
        <div className={styles.logoShell} aria-hidden="true">
          <span className={styles.orbit} />
          <svg viewBox="0 0 64 64" width="64" height="64" focusable="false">
            <rect width="64" height="64" rx="16" fill="#007a87" />
            <circle cx="32" cy="25" r="12" fill="#ffd285" />
            <path d="M10 37C18 27 27 47 38 37S50 31 54 34V54H10Z" fill="#007a87" />
            <path d="M10 37C18 27 27 47 38 37S50 31 54 34" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            <path d="M14 47C22 40 29 55 40 47S49 43 51 44" fill="none" stroke="#9de3de" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className={styles.wordmark} aria-hidden="true">
          Sol<span>&amp;</span>Tide <small>Energy</small>
        </div>
        <p>{caption}</p>
        <div className={styles.energyLine} aria-hidden="true">
          <span />
        </div>
        {children}
      </div>
    </div>
  );
}
