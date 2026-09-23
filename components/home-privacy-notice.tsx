"use client";

import Link from "next/link";
import { regionPath } from "@/lib/site-region-routing";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSiteRegion } from "./site-region";
import styles from "./home-privacy-notice.module.css";
import { readPreferences, savePreferences, PREFERENCES_KEY, LEGACY_DISMISSED_KEY as STORAGE_KEY, type Preferences } from "@/lib/cookie-preferences";

// Fallback for browsers where persistent storage is unavailable.
let acknowledged = false;
let remembered: Preferences | null = null;

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
    const sync = (event: StorageEvent) => {
      if (event.key !== PREFERENCES_KEY) return;
      const saved = readPreferences();
      remembered = saved;
      acknowledged = Boolean(saved);
      dismissed.current = Boolean(saved);
      if (saved) {
        setAnalytics(saved.analytics);
        setMarketing(saved.marketing);
        setVisible(false);
        dialog.current?.close();
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sol-tide:cookie-notice", { detail: visible }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("sol-tide:cookie-notice", { detail: false }),
      );
    };
  }, [visible]);

  useEffect(() => {
    setVisible(false);
    dismissed.current = acknowledged;
    const saved = readPreferences() ?? remembered;
    if (saved) {
      remembered = saved;
      acknowledged = true;
      dismissed.current = true;
      setAnalytics(saved.analytics);
      setMarketing(saved.marketing);
    }
    try {
      dismissed.current ||= sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* Storage is optional. */
    }
    if (
      !["/", "/antigua", "/dominica"].includes(pathname) ||
      dismissed.current ||
      (!country && pathname !== "/") ||
      regionOpen
    )
      return;
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

  function close(selection?: Preferences) {
    dialog.current?.close();
    dismissed.current = true;
    acknowledged = true;
    remembered = selection ??
      remembered ?? { analytics: false, marketing: false };
    setAnalytics(remembered.analytics);
    setMarketing(remembered.marketing);
    savePreferences(remembered);
    setVisible(false);
    if (manuallyOpened.current) trigger.current?.focus({ preventScroll: true });
    manuallyOpened.current = false;
  }
  function chooseAll(enabled: boolean) {
    close({ analytics: enabled, marketing: enabled });
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-expanded={visible}
        onClick={() => {
          const saved = readPreferences() ?? remembered;
          setAnalytics(saved?.analytics ?? false);
          setMarketing(saved?.marketing ?? false);
          manuallyOpened.current = true;
          setVisible(true);
        }}
      >
        Cookie preferences
      </button>
      {visible &&
        createPortal(
          <aside
            data-cookie-notice
            className={styles.notice}
            aria-labelledby="home-privacy-title"
          >
            <div className={styles.copy}>
              <h2 id="home-privacy-title">Cookie Preferences</h2>
              <p>
                Information about cookies, privacy and your browsing experience.
                Learn how information is handled in our{" "}
                <Link href={regionPath(country, "/privacy")} prefetch={false}>
                  Privacy Policy
                </Link>
                .
              </p>
              <p className={styles.disclosure}>
                Your choices are remembered in this browser. These preview
                controls save your preference only; they do not yet control analytics or marketing services.
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
              onClick={() => close()}
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
          connected to analytics or marketing controls. Only your preference
          is saved; changing it does not affect website functionality.
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
          <button
            type="button"
            className={styles.secondary}
            onClick={() => close({ analytics, marketing })}
          >
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
          Choices are saved in this browser without an expiry date. You can
          change them through Cookie preferences in the footer. Clearing browser
          data removes your saved choices; service controls are not connected
          yet.
        </p>
      </dialog>
    </>
  );
}
