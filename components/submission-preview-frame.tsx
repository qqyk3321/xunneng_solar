"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./submission-preview-frame.module.css";

export function SubmissionPreviewFrame({ previewUrl }: { previewUrl: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const url = new URL(previewUrl);
  url.searchParams.set("dynamicHeight", "1");
  const embedUrl = url.href;
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const initialize = useCallback(() => {
    (
      window as Window & { Tally?: { loadEmbeds: () => void } }
    ).Tally?.loadEmbeds();
    // Preview pages may not answer the resize handshake. Never clip the record.
    frame.current?.setAttribute("scrolling", "auto");
  }, []);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new MutationObserver(() => {
      if (element.getAttribute("scrolling") !== "auto")
        element.setAttribute("scrolling", "auto");
    });
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["scrolling"],
    });
    initialize();
    return () => observer.disconnect();
  }, [attempt, embedUrl, initialize]);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [loading, attempt]);
  return (
    <section className={styles.record} aria-label="Your submitted consultation">
      <Script
        src="https://tally.so/widgets/embed.js"
        strategy="afterInteractive"
        onReady={initialize}
      />
      <div className={styles.toolbar}>
        <h2>Your submitted details</h2>
      </div>
      {slow && loading && (
        <div className={styles.slow} role="status">
          <p>The preview is taking a little longer. Please try reloading it.</p>
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
          ref={frame}
          key={`${embedUrl}-${attempt}`}
          src={embedUrl}
          height="720"
          scrolling="auto"
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
