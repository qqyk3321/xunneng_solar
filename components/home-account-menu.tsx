"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import {
  ChevronDown,
  ClipboardList,
  KeyRound,
  LoaderCircle,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase-auth/client";
import type { AuthIdentity } from "@/app/auth-preview/auth-panel";
import styles from "./home-account-menu.module.css";

type MenuProps = {
  identity: AuthIdentity | null;
  busy?: boolean;
  error?: string | null;
  onSignOut: () => void;
};

// Separate presentation from session integration so keyboard/error/signed-in
// states can be tested without creating users or weakening server validation.
export function AccountMenu({
  identity,
  busy = false,
  error,
  onSignOut,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  useEffect(() => {
    if (open)
      menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menu.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp")
      next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    items[next]?.focus();
  }

  if (!identity)
    return (
      <div className={styles.account}>
        <Link
          className={styles.signIn}
          href="/auth-preview?returnTo=/home-preview"
        >
          <LogIn size={17} aria-hidden="true" />
          <span>Sign in</span>
        </Link>
        {error && (
          <span className={styles.connectionHint} role="status" title={error}>
            !
          </span>
        )}
      </div>
    );

  return (
    <div
      className={styles.account}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={styles.avatar}>
          {identity.email?.slice(0, 2).toUpperCase() ?? (
            <UserRound size={18} aria-hidden="true" />
          )}
        </span>
        <span className={styles.identity}>
          <span>Signed in</span>
          <strong>{identity.email ?? "My account"}</strong>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={styles.dropdown}
          id={menuId}
          role="menu"
          aria-label="Account"
          ref={menu}
          onKeyDown={navigateMenu}
        >
          <div className={styles.menuIdentity} role="presentation">
            <span>Signed in as</span>
            <strong>{identity.email ?? "Your account"}</strong>
          </div>
          <Link
            role="menuitem"
            className={styles.item}
            href="/my-submissions-preview"
            prefetch={false}
            onClick={() => setOpen(false)}
          >
            <ClipboardList size={17} aria-hidden="true" />
            My submissions
          </Link>
          <Link
            role="menuitem"
            className={styles.item}
            href="/auth-preview/update-password?returnTo=/home-preview"
            onClick={() => setOpen(false)}
          >
            <KeyRound size={17} aria-hidden="true" />
            Change password
          </Link>
          <button
            role="menuitem"
            className={styles.signOut}
            type="button"
            disabled={busy}
            onClick={onSignOut}
          >
            {busy ? (
              <LoaderCircle
                className={styles.spinner}
                size={17}
                aria-hidden="true"
              />
            ) : (
              <LogOut size={17} aria-hidden="true" />
            )}
            {busy ? "Signing out…" : "Sign out"}
          </button>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function HomeAccount({
  initialIdentity,
  configured,
  unavailable = false,
}: {
  initialIdentity: AuthIdentity | null;
  configured: boolean;
  unavailable?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(
    () => (configured ? createClient() : null),
    [configured],
  );
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = pending || refreshing;

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        startTransition(() => router.refresh());
      }
    });
    // Server-side sign-in writes cookies without necessarily emitting a
    // browser auth event in this tab. Re-check when returning to this tab.
    const onFocus = () => startTransition(() => router.refresh());
    window.addEventListener("focus", onFocus);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [router, supabase]);

  async function signOut() {
    if (busy || !supabase) return;
    setPending(true);
    setError(null);
    try {
      const { error: failure } = await supabase.auth.signOut({
        scope: "local",
      });
      if (failure) throw failure;
      startTransition(() => router.refresh());
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AccountMenu
      identity={initialIdentity}
      busy={busy}
      onSignOut={signOut}
      error={
        error ??
        (unavailable
          ? "Account status is temporarily unavailable. Please try signing in."
          : null)
      }
    />
  );
}
