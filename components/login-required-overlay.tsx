"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { previewReturnPath } from "@/lib/supabase-auth/return-path";
import styles from "./login-required-overlay.module.css";

// UI only: callers MUST authorize on the server before fetching private data.
// Never pass protected content as children when required is true.
export function LoginRequiredOverlay({
  required,
  returnTo,
  children,
}: {
  required: boolean;
  returnTo: string;
  children: ReactNode;
}) {
  const safeReturn = previewReturnPath(returnTo);
  const loginHref = safeReturn
    ? `/auth-preview?returnTo=${encodeURIComponent(safeReturn)}`
    : "/auth-preview";
  return (
    <>
      <div
        inert={required || undefined}
        aria-hidden={required || undefined}
        className={required ? styles.blocked : undefined}
      >
        {children}
      </div>
      {required && <LoginPrompt key={loginHref} loginHref={loginHref} />}
    </>
  );
}

function LoginPrompt({ loginHref }: { loginHref: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const login = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaving = useRef(false);
  const [remaining, setRemaining] = useState(5);

  function stopCountdown() {
    leaving.current = true;
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    leaving.current = false;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    login.current?.focus({ preventScroll: true });

    function containFocus(event: FocusEvent) {
      if (!dialog.current?.contains(event.target as Node))
        login.current?.focus({ preventScroll: true });
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        dialog.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
      );
      if (!items.length) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLAnchorElement);
      items[
        (index + (event.shiftKey ? -1 : 1) + items.length) % items.length
      ]?.focus();
    }
    document.addEventListener("focusin", containFocus);
    document.addEventListener("keydown", keyboard, true);
    const deadline = Date.now() + 5000;
    timer.current = setInterval(() => {
      if (leaving.current) return;
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        stopCountdown();
        // Replace prevents Back from returning to an expired prompt and looping.
        window.location.replace(loginHref);
      }
    }, 200);
    return () => {
      stopCountdown();
      document.removeEventListener("focusin", containFocus);
      document.removeEventListener("keydown", keyboard, true);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [loginHref]);

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        ref={dialog}
      >
        <span className={styles.icon}>
          <LockKeyhole size={26} aria-hidden="true" />
        </span>
        <p className={styles.eyebrow}>SECURE ACCOUNT ACCESS</p>
        <h2 id={titleId}>Please sign in to continue</h2>
        <p id={descriptionId} className={styles.description}>
          You’re not signed in, or your session has expired. Please sign in to
          access this page securely.
        </p>
        <p
          className={styles.countdown}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {remaining > 0 ? (
            <>
              Going to the sign-in page in <strong>{remaining}</strong>{" "}
              {remaining === 1 ? "second" : "seconds"}…
            </>
          ) : (
            "Taking you to sign in…"
          )}
        </p>
        <a
          className={styles.primary}
          href={loginHref}
          ref={login}
          onClick={(event) => {
            stopCountdown();
            if (
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              window.location.replace(loginHref);
            }
          }}
        >
          Sign in now
          <ArrowRight size={17} aria-hidden="true" />
        </a>
        <Link
          className={styles.secondary}
          href="/home-preview"
          prefetch={false}
          onClick={stopCountdown}
        >
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
