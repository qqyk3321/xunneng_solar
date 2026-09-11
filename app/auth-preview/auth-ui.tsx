"use client";

import Image from "next/image";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import styles from "./auth-preview.module.css";

export function AuthBrandImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={styles.brandFallback} aria-hidden="true">
      ST
    </span>
  ) : (
    <Image
      unoptimized
      width={36}
      height={36}
      alt=""
      src={src}
      onError={() => setFailed(true)}
    />
  );
}

export function AuthCard({
  children,
  accent = false,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <section className={`${styles.card} ${accent ? styles.accentCard : ""}`}>
      {children}
    </section>
  );
}

export function AuthHeading({
  title,
  description,
  eyebrow = "Account access",
  centered = false,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  centered?: boolean;
}) {
  return (
    <div className={`${styles.heading} ${centered ? styles.centered : ""}`}>
      {centered ? (
        <span className={styles.iconCircle}>
          <LockKeyhole size={24} aria-hidden="true" />
        </span>
      ) : null}
      <span className={styles.eyebrow}>
        {!centered && <i aria-hidden="true" />}
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export function AuthAlert({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`${styles.alert} ${error ? styles.errorAlert : styles.successAlert}`}
    >
      <Icon size={20} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
};

export function AuthField({
  id,
  label,
  error,
  hint,
  action,
  type = "text",
  ...props
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const Icon = isPassword ? KeyRound : Mail;
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id}>{label}</label>
        {action ?? (hint && <span id={`${id}-hint`}>{hint}</span>)}
      </div>
      <div className={styles.inputWrap}>
        <Icon className={styles.inputIcon} size={19} aria-hidden="true" />
        <input
          {...props}
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={isPassword ? styles.passwordInput : undefined}
        />
        {isPassword && (
          <button
            className={styles.visibilityButton}
            type="button"
            disabled={props.disabled}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordCriteria({ password }: { password: string }) {
  const valid = password.length >= 8;
  return (
    <div className={styles.criteria}>
      <span>Password requirement</span>
      <p className={valid ? styles.criterionMet : ""}>
        {valid ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Circle size={16} aria-hidden="true" />
        )}
        At least 8 characters
        {valid && <span className={styles.srOnly}> — met</span>}
      </p>
    </div>
  );
}

export function SubmitButton({
  busy,
  children,
  busyText = "Please wait…",
  danger = false,
  disabled = false,
}: {
  busy: boolean;
  children: ReactNode;
  busyText?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className={danger ? styles.dangerButton : styles.primaryButton}
    >
      {busy ? (
        <>
          <LoaderCircle
            className={styles.spinner}
            size={18}
            aria-hidden="true"
          />
          {busyText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthResult({
  title,
  description,
  kind = "email",
  children,
}: {
  title: string;
  description: ReactNode;
  kind?: "email" | "success" | "expired";
  children: ReactNode;
}) {
  const Icon =
    kind === "email" ? Mail : kind === "success" ? ShieldCheck : AlertCircle;
  return (
    <div className={styles.result}>
      <span
        className={`${styles.iconCircle} ${kind === "expired" ? styles.errorIcon : ""}`}
      >
        <Icon size={30} aria-hidden="true" />
      </span>
      <span className={styles.resultEyebrow}>
        {kind === "email"
          ? "Check your inbox"
          : kind === "success"
            ? "Account updated"
            : "Account recovery"}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className={styles.resultActions}>{children}</div>
    </div>
  );
}
