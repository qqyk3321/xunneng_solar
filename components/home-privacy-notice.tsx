"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSiteRegion } from "./site-region";
import styles from "./home-privacy-notice.module.css";

const STORAGE_KEY = "sol-tide:cookie-ui:dismissed:v2";
// In-memory fallback if the browser blocks sessionStorage.
let acknowledged = false;

export function HomePrivacyNotice() {
  const pathname = usePathname();
  const { country, open: regionOpen } = useSiteRegion();
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const manuallyOpened = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setVisible(false);
    dismissed.current = acknowledged;
    try {
      dismissed.current ||= sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* Storage is optional. */
    }
    if (pathname !== "/" || dismissed.current || !country || regionOpen) return;
    let elapsed = false;
    let shown = false;
    const check = () => {
      if (!shown && !dismissed.current && elapsed && window.scrollY > 150) {
        shown = true;
        setVisible(true);
      }
    };
    const timer = window.setTimeout(() => {
      elapsed = true;
      check();
    }, 5000);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", check);
    };
  }, [pathname, country, regionOpen]);

  function close() {
    dialog.current?.close();
    dismissed.current = true;
    acknowledged = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* Keep the in-memory dismissal. */
    }
    setVisible(false);
    if (manuallyOpened.current) trigger.current?.focus({ preventScroll: true });
    manuallyOpened.current = false;
  }
  function chooseAll(enabled: boolean) {
    // UI draft only: never persist a consent record or change service loading.
    setAnalytics(enabled);
    setMarketing(enabled);
    close();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-expanded={visible}
        onClick={() => {
          manuallyOpened.current = true;
          setVisible(true);
        }}
      >
        Cookie preferences
      </button>
      {visible &&
        createPortal(
          <aside className={styles.notice} aria-labelledby="home-privacy-title">
            <div className={styles.copy}>
              <h2 id="home-privacy-title">Cookie Preferences</h2>
              <p>
                Information about cookies, privacy and your browsing experience.
                Learn how information is handled in our{" "}
                <Link href="/privacy" prefetch={false}>
                  Privacy Policy
                </Link>
                .
              </p>
              <p className={styles.disclosure}>
                Interface preview: preference controls are not connected yet.
                These buttons do not change cookies or website services.
              </p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => dialog.current?.showModal()}
              >
                Manage preferences
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => chooseAll(false)}
              >
                Reject optional
              </button>
              <button
                type="button"
                className={styles.acknowledge}
                onClick={() => chooseAll(true)}
              >
                Accept all
              </button>
            </div>
            <button
              type="button"
              className={styles.close}
              aria-label="Close cookie notice"
              onClick={close}
            >
              ×
            </button>
          </aside>,
          document.body,
        )}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="cookie-dialog-title"
        aria-describedby="cookie-dialog-description"
      >
        <button
          type="button"
          className={styles.close}
          aria-label="Close preferences"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <h2 id="cookie-dialog-title">Cookie Preferences</h2>
        <p id="cookie-dialog-description">
          Preview the available preference categories. This interface is not
          connected to cookie or tracking controls. Changing these options does
          not affect website functionality.
        </p>
        <div className={styles.option}>
          <div>
            <h3>Strictly necessary</h3>
            <p>
              Reserved for services essential to requested website features.
            </p>
          </div>
          <span>Always active</span>
        </div>
        <div className={styles.option}>
          <div>
            <h3>Analytics</h3>
            <p>Planned category for understanding website usage.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Analytics preview"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
        </div>
        <div className={styles.option}>
          <div>
            <h3>Marketing</h3>
            <p>Planned category for optional advertising services.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Marketing preview"
            checked={marketing}
            onChange={(event) => setMarketing(event.target.checked)}
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => chooseAll(false)}
          >
            Reject optional
          </button>
          <button type="button" className={styles.secondary} onClick={close}>
            Confirm selection
          </button>
          <button
            type="button"
            className={styles.acknowledge}
            onClick={() => chooseAll(true)}
          >
            Accept all
          </button>
        </div>
        <p className={styles.disclosure}>
          Only dismissal of this notice is remembered for this tab. No consent
          preferences are saved or applied.
        </p>
      </dialog>
    </>
  );
}
