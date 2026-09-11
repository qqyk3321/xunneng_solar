import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase-auth/server";
import {
  isSupabaseAuthConfigured,
  supabasePublicUrl,
} from "@/lib/supabase-auth/config";
import {
  loadAccountSubmissions,
  type SubmissionsResult,
} from "@/lib/account-submissions/server";
import { RefreshSubmissions, SubmissionsTable } from "./submissions-table";
import styles from "./submissions.module.css";
import { LoginRequiredOverlay } from "@/components/login-required-overlay";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "My Submissions | Sol & Tide Energy",
  robots: { index: false, follow: false },
};

export default async function MySubmissionsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  let result: SubmissionsResult = { kind: "error" };
  if (isSupabaseAuthConfigured()) {
    result = await loadAccountSubmissions({
      getUser: async () => (await createClient()).auth.getUser(),
      url: process.env.SUPABASE_URL?.trim(),
      authUrl: supabasePublicUrl,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    });
  }
  return (
    <LoginRequiredOverlay
      required={result.kind === "signed-out"}
      returnTo="/my-submissions-preview"
    >
      <div className={styles.page}>
        <header className={styles.header}>
          <Link href="/home-preview" className={styles.brand}>
            Sol &amp; Tide Energy
          </Link>
          <span className={styles.badge}>Account preview</span>
        </header>
        <main className={styles.main}>
          <Link href="/home-preview" className={styles.back}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to homepage preview
          </Link>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>
              <FileText size={16} aria-hidden="true" />
              YOUR ACCOUNT
            </span>
            <h1>My submissions</h1>
            <p>All your submitted consultations, in one place.</p>
            {result.kind === "ready" && (
              <div className={styles.email}>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>{result.email}</span>
              </div>
            )}
          </div>
          {result.kind === "ready" ? (
            <SubmissionsTable rows={result.rows} />
          ) : result.kind === "signed-out" ? (
            <section className={`${styles.card} ${styles.message}`}>
              <h2>Submission history</h2>
              <p>Your submissions will appear here after you sign in.</p>
            </section>
          ) : (
            <section className={`${styles.card} ${styles.message}`}>
              <h2>
                {result.kind === "verify-email"
                  ? "Verify your email first"
                  : "We couldn’t load your submissions"}
              </h2>
              <p>
                {result.kind === "verify-email"
                  ? "Confirm your account’s email before accessing submissions linked to it."
                  : "Your records have not been changed. Please refresh and try again."}
              </p>
              {result.kind === "error" ? (
                <RefreshSubmissions />
              ) : (
                <Link className={styles.primaryButton} href="/auth-preview">
                  Go to account access
                </Link>
              )}
            </section>
          )}
        </main>
      </div>
    </LoginRequiredOverlay>
  );
}
