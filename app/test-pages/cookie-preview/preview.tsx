"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import styles from "./preview.module.css";

export function CookiePreview() {
  const [banner, setBanner] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  function finish() {
    dialog.current?.close();
    setBanner(false);
    setMessage("Demo closed. No cookies, tracking or services were changed.");
  }
  function chooseAll(value: boolean) {
    setAnalytics(value);
    setMarketing(value);
    finish();
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="Sol & Tide Energy home"
        >
          <BrandMark />
          Sol &amp; Tide Energy
        </Link>
        <Link href="/test-pages">Back to test pages</Link>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>
          DESIGN PREVIEW · NOT A LIVE CONSENT MANAGER
        </p>
        <h1>
          A little clarity.
          <br />A considered experience.
        </h1>
        <p>
          Explore the look and feel of our future cookie preferences. This page
          is a local-only UI prototype. Controls do not affect data collection
          or any website feature, and choices reset on refresh.
        </p>
        <div className={styles.actions}>
          <button
            onClick={() => {
              setBanner(true);
              setMessage("");
            }}
          >
            Show banner again
          </button>
          <button onClick={() => dialog.current?.showModal()}>
            Cookie settings
          </button>
        </div>
        <p role="status">{message}</p>
        <Link href="/privacy">Read our draft privacy policy</Link>
      </main>
      {banner && (
        <aside className={styles.banner} aria-labelledby="cookie-banner-title">
          <div>
            <p className={styles.eyebrow}>COOKIE PREFERENCES · UI PREVIEW</p>
            <h2 id="cookie-banner-title">Your visit. Your preferences.</h2>
            <p>
              A preview of how you could manage optional cookies in the future.
              These demonstration buttons do not enable or disable cookies.{" "}
              <Link href="/privacy#cookies">Privacy information</Link>
            </p>
          </div>
          <div className={styles.actions}>
            <button onClick={() => dialog.current?.showModal()}>
              Settings
            </button>
            <button onClick={() => chooseAll(false)}>Reject optional</button>
            <button className={styles.primary} onClick={() => chooseAll(true)}>
              Accept all
            </button>
          </div>
        </aside>
      )}
      <dialog
        className={styles.dialog}
        ref={dialog}
        aria-labelledby="cookie-settings-title"
        aria-describedby="cookie-demo-description"
      >
        <div className={styles.dialogHeader}>
          <p className={styles.eyebrow}>YOUR PREFERENCES · UI PREVIEW</p>
          <button
            autoFocus
            onClick={() => dialog.current?.close()}
            aria-label="Close cookie settings"
          >
            Close
          </button>
        </div>
        <h2 id="cookie-settings-title">Make yourself at home.</h2>
        <p id="cookie-demo-description">
          Design demonstration only. These categories illustrate a future
          interface, not an inventory of cookies used by this site. No actual
          cookie controls are connected.
        </p>
        <div className={styles.option}>
          <div>
            <h3>Necessary</h3>
            <p>Reserved for storage required to operate requested features.</p>
          </div>
          <label>
            <input
              type="checkbox"
              checked
              disabled
              aria-label="Necessary cookies"
            />{" "}
            Always on
          </label>
        </div>
        <div className={styles.option}>
          <div>
            <h3>Analytics</h3>
            <p>A future option for understanding how the website is used.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Analytics cookies"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
        </div>
        <div className={styles.option}>
          <div>
            <h3>Marketing</h3>
            <p>A future option for optional advertising-related services.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Marketing cookies"
            checked={marketing}
            onChange={(event) => setMarketing(event.target.checked)}
          />
        </div>
        <div className={styles.actions}>
          <button onClick={() => chooseAll(false)}>Reject optional</button>
          <button className={styles.primary} onClick={finish}>
            Save choices
          </button>
        </div>
        <p className={styles.fine}>
          Choices are held in this page’s memory only. Nothing is saved or
          enforced.
        </p>
      </dialog>
    </div>
  );
}
