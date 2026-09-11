"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, LogOut } from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createClient } from "@/lib/supabase-auth/client";
import {
  AuthRequestError,
  submitAuthAction,
} from "@/lib/auth-protection/client";
import type { AuthAction } from "@/lib/auth-protection/policy";
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthHeading,
  AuthResult,
  PasswordCriteria,
  SubmitButton,
} from "./auth-ui";
import styles from "./auth-preview.module.css";

export type AuthIdentity = { id: string; email: string | null };
export type AuthMode = "sign-in" | "sign-up" | "forgot";
type FieldErrors = { email?: string; password?: string; confirmation?: string };

export function AuthPanel({
  initialIdentity,
  initialNotice,
  initialMode = "sign-in",
  returnTo = null,
}: {
  initialIdentity: AuthIdentity | null;
  initialNotice: string | null;
  initialMode?: AuthMode;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialIdentity?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [navigating, startTransition] = useTransition();
  const busy = pending || navigating;
  const [message, setMessage] = useState(initialNotice);
  const [isError, setIsError] = useState(Boolean(initialNotice));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState<"sign-up" | "forgot" | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [retryUntil, setRetryUntil] = useState<
    Partial<Record<AuthAction, number>>
  >({});
  const [now, setNow] = useState(() => Date.now());
  const [serverSession, setServerSession] = useState("Checking…");

  const remaining = (action: AuthAction) =>
    Math.max(0, Math.ceil(((retryUntil[action] ?? 0) - now) / 1000));
  const submitWait = remaining(mode);
  const resendWait = Math.max(cooldown, remaining("resend"));

  useEffect(() => {
    if (!Object.values(retryUntil).some((deadline) => deadline > Date.now()))
      return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (!Object.values(retryUntil).some((deadline) => deadline > current)) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !initialIdentity) return;
    let cancelled = false;
    fetch("/auth-preview/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session check failed");
        const payload = (await response.json()) as { authenticated?: boolean };
        if (!cancelled)
          setServerSession(
            payload.authenticated
              ? "Verified by the backend"
              : "No verified session",
          );
      })
      .catch(() => {
        if (!cancelled) setServerSession("Verification request failed");
      });
    return () => {
      cancelled = true;
    };
  }, [initialIdentity]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_OUT" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        startTransition(() => router.refresh());
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, supabase]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setPassword("");
    setConfirmation("");
    setMessage(null);
    setErrors({});
    setSent(null);
  }

  function reportError(error: unknown, action?: AuthAction) {
    if (error instanceof AuthRequestError && error.retryAfter > 0 && action) {
      const current = Date.now();
      const deadline = current + error.retryAfter * 1000;
      setNow(current);
      setRetryUntil((previous) =>
        action === "sign-in"
          ? { ...previous, "sign-in": deadline }
          : {
              ...previous,
              "sign-up": deadline,
              forgot: deadline,
              resend: deadline,
            },
      );
    }
    setIsError(true);
    setMessage(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitWait > 0) return;
    const nextErrors: FieldErrors = {};
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
      nextErrors.email = "Enter a valid email address.";
    if (mode !== "forgot" && !password)
      nextErrors.password = "Enter your password.";
    if (mode === "sign-up" && password.length < 8)
      nextErrors.password = "Use at least 8 characters.";
    if (mode === "sign-up" && (!confirmation || password !== confirmation))
      nextErrors.confirmation = "The passwords must match.";
    setErrors(nextErrors);
    setMessage(null);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setPending(true);
    setEmail(address);
    try {
      const result = await submitAuthAction({
        action: mode,
        email: address,
        ...(mode !== "forgot" ? { password } : {}),
        ...(mode === "sign-up" ? { confirmation } : {}),
      });
      if (mode === "forgot") {
        setSent("forgot");
        return;
      }
      if (mode === "sign-up") {
        if (!result.authenticated) {
          setSent("sign-up");
          setCooldown(60);
          setPassword("");
          setConfirmation("");
          return;
        }
      }
      setPassword("");
      setConfirmation("");
      startTransition(() => {
        if (returnTo) router.replace(returnTo);
        router.refresh();
      });
    } catch (error) {
      reportError(error, mode);
    } finally {
      setPending(false);
    }
  }

  async function resendConfirmation() {
    if (busy || resendWait > 0) return;
    setPending(true);
    setMessage(null);
    try {
      await submitAuthAction({ action: "resend", email });
      setCooldown(60);
      setIsError(false);
      setMessage(
        "If confirmation is needed, a new email will arrive shortly. Please check your spam folder too.",
      );
    } catch (error) {
      reportError(error, "resend");
    } finally {
      setPending(false);
    }
  }

  async function handleSignOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setPending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      switchMode("sign-in");
      startTransition(() => router.refresh());
    } catch (error) {
      reportError(error);
    } finally {
      setPending(false);
    }
  }

  if (initialIdentity && mode !== "forgot")
    return (
      <AuthCard>
        <span className={styles.sessionBadge}>
          <i aria-hidden="true" />
          Signed in
        </span>
        <h1 className={styles.accountHeading}>Welcome back.</h1>
        <p className={styles.accountDescription}>
          You’re signed in to your Sol &amp; Tide account.
        </p>
        <div className={styles.accountIdentity}>
          <span className={styles.avatar} aria-hidden="true">
            {initialIdentity.email?.slice(0, 2).toUpperCase() ?? "ST"}
          </span>
          <div>
            <small>Your account</small>
            <strong>{initialIdentity.email ?? "Email not available"}</strong>
          </div>
        </div>
        {message && <AuthAlert error={isError}>{message}</AuthAlert>}
        <div className={styles.actions}>
          <Link
            href="/auth-preview/update-password"
            className={styles.secondaryButton}
          >
            <KeyRound size={17} aria-hidden="true" />
            Change password
          </Link>
          <form onSubmit={handleSignOut}>
            <SubmitButton busy={busy} busyText="Signing out…" danger>
              <LogOut size={17} aria-hidden="true" />
              Sign out
            </SubmitButton>
          </form>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className={styles.debug}>
            <summary>Development session details</summary>
            <dl>
              <dt>User ID</dt>
              <dd>{initialIdentity.id}</dd>
              <dt>Server session</dt>
              <dd>{serverSession}</dd>
            </dl>
          </details>
        )}
      </AuthCard>
    );

  if (sent)
    return (
      <AuthCard>
        <AuthResult
          title={sent === "forgot" ? "Check your inbox" : "Confirm your email"}
          description={
            <>
              {sent === "forgot"
                ? "If an account exists for "
                : "If confirmation is needed for "}
              <span className={styles.emailAddress}>{email}</span>
              {sent === "forgot"
                ? ", you’ll receive a link to reset your password."
                : ", you’ll receive an email with a confirmation link."}
            </>
          }
        >
          <div className={styles.noticeBox}>
            Open the link in your email to continue. Can’t find it? Check your
            spam folder.
          </div>
          {message && <AuthAlert error={isError}>{message}</AuthAlert>}
          {sent === "sign-up" && (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy || resendWait > 0}
              onClick={resendConfirmation}
            >
              {busy
                ? "Sending…"
                : resendWait > 0
                  ? "Resend available in " + resendWait + "s"
                  : "Resend confirmation email"}
            </button>
          )}
          <button
            type="button"
            className={styles.textButton}
            disabled={busy}
            onClick={() => switchMode(sent)}
          >
            {sent === "forgot"
              ? "Use another email or request a new link"
              : "Use another email"}
          </button>
          <button
            type="button"
            className={styles.textButton}
            disabled={busy}
            onClick={() => switchMode("sign-in")}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </button>
        </AuthResult>
      </AuthCard>
    );

  return (
    <AuthCard>
      <AuthHeading
        title={
          mode === "sign-in"
            ? "Welcome Back"
            : mode === "sign-up"
              ? "Create Your Account"
              : "Forgot Your Password?"
        }
        description={
          mode === "sign-in"
            ? "Sign in to your Sol & Tide account."
            : mode === "sign-up"
              ? "Get started with your email address and a password."
              : "Enter your email and we’ll help you reset your password."
        }
        eyebrow={mode === "forgot" ? "Account recovery" : "Account access"}
      />
      <form
        className={styles.form}
        noValidate
        onSubmit={handleSubmit}
        aria-busy={busy}
      >
        <fieldset className={styles.fieldset} disabled={busy}>
          <legend className={styles.srOnly}>
            {mode === "sign-in"
              ? "Sign in"
              : mode === "sign-up"
                ? "Create account"
                : "Request password reset"}
          </legend>
          <AuthField
            id="email"
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            value={email}
            error={errors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {mode !== "forgot" && (
            <AuthField
              key={mode}
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              placeholder={
                mode === "sign-up" ? "Create a password" : "Enter your password"
              }
              required
              value={password}
              error={errors.password}
              onChange={(event) => setPassword(event.target.value)}
              action={
                mode === "sign-in" ? (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot password?
                  </button>
                ) : undefined
              }
            />
          )}
          {mode === "sign-up" && (
            <>
              <PasswordCriteria password={password} />
              <AuthField
                id="confirmation"
                name="confirmation"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                required
                value={confirmation}
                error={errors.confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </>
          )}
          {message && <AuthAlert error={isError}>{message}</AuthAlert>}
          <SubmitButton
            busy={busy}
            disabled={submitWait > 0}
            busyText={
              mode === "forgot"
                ? "Sending link…"
                : mode === "sign-up"
                  ? "Creating account…"
                  : "Signing in…"
            }
          >
            {submitWait > 0
              ? "Try again in " + submitWait + "s"
              : mode === "sign-in"
                ? "Sign in"
                : mode === "sign-up"
                  ? "Create account"
                  : "Send reset link"}
            <ArrowRight size={17} aria-hidden="true" />
          </SubmitButton>
        </fieldset>
      </form>
      {mode === "forgot" ? (
        <div className={styles.backNav}>
          <button
            className={styles.textButton}
            disabled={busy}
            type="button"
            onClick={() => switchMode("sign-in")}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </button>
        </div>
      ) : (
        <div className={styles.bottomNav}>
          <span>
            {mode === "sign-in"
              ? "New to Sol & Tide?"
              : "Already have an account?"}
          </span>
          <button
            className={styles.textButton}
            disabled={busy}
            type="button"
            onClick={() =>
              switchMode(mode === "sign-in" ? "sign-up" : "sign-in")
            }
          >
            {mode === "sign-in" ? "Create an account" : "Sign in"}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </AuthCard>
  );
}
