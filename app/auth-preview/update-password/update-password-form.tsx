"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-auth/client";
import {
  AuthAlert,
  AuthField,
  AuthHeading,
  AuthResult,
  PasswordCriteria,
  SubmitButton,
} from "../auth-ui";
import styles from "../auth-preview.module.css";

export function UpdatePasswordForm({
  returnTo = null,
}: {
  returnTo?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmation?: string;
  }>({});
  const [complete, setComplete] = useState(false);
  const [expired, setExpired] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage(null);
    const nextErrors: typeof errors = {};
    if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!confirmation || password !== confirmation)
      nextErrors.confirmation = "The passwords must match.";
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (
          error.name === "AuthSessionMissingError" ||
          error.code === "session_not_found" ||
          error.code === "refresh_token_not_found"
        ) {
          setExpired(true);
          return;
        }
        throw error;
      }
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (complete)
    return (
      <AuthResult
        kind="success"
        title="Password Updated Successfully!"
        description="Your new password is ready to use the next time you sign in."
      >
        <Link
          className={styles.primaryButton}
          href={returnTo ?? "/auth-preview"}
        >
          {returnTo ? "Return to homepage" : "Return to account"}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </AuthResult>
    );

  if (expired)
    return (
      <AuthResult
        kind="expired"
        title="Let’s Get You a New Link"
        description="Your session is no longer available. Request another password reset email to continue."
      >
        <Link className={styles.amberButton} href="/auth-preview?view=forgot">
          Request new reset link
        </Link>
        <Link className={styles.textButton} href={returnTo ?? "/auth-preview"}>
          {returnTo ? "Back to homepage" : "Back to account access"}
        </Link>
      </AuthResult>
    );

  return (
    <>
      <AuthHeading
        title="Set New Password"
        eyebrow="Secure access"
        description="Choose a new password for your Sol & Tide account."
        centered
      />
      <form
        className={styles.form}
        noValidate
        onSubmit={handleSubmit}
        aria-busy={busy}
      >
        <fieldset className={styles.fieldset} disabled={busy}>
          <legend className={styles.srOnly}>Set new password</legend>
          <AuthField
            id="password"
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="Enter your new password"
            required
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AuthField
            id="confirmation"
            name="confirmation"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            required
            value={confirmation}
            error={errors.confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <PasswordCriteria password={password} />
          {message && <AuthAlert error>{message}</AuthAlert>}
          <SubmitButton busy={busy} busyText="Updating password…">
            <LockKeyhole size={17} aria-hidden="true" />
            Update password
          </SubmitButton>
        </fieldset>
      </form>
      <div className={styles.backNav}>
        <Link className={styles.textButton} href={returnTo ?? "/auth-preview"}>
          <ArrowLeft size={16} aria-hidden="true" />
          {returnTo ? "Back to homepage" : "Back to account access"}
        </Link>
      </div>
    </>
  );
}
