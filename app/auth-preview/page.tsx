import { AuthPanel, type AuthIdentity, type AuthMode } from "./auth-panel";
import { AuthCard, AuthHeading, AuthAlert } from "./auth-ui";
import { isSupabaseAuthConfigured } from "@/lib/supabase-auth/config";
import { createClient } from "@/lib/supabase-auth/server";
import { previewReturnPath } from "@/lib/supabase-auth/return-path";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./auth-preview.module.css";

export const dynamic = "force-dynamic";

export default async function AuthPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo = previewReturnPath(params.returnTo);
  if (!isSupabaseAuthConfigured())
    return (
      <AuthCard>
        <AuthHeading
          title="Account access is not configured"
          description="This preview needs Supabase Auth configuration before you can sign in."
        />
        <AuthAlert error>
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          in your local environment, then restart the app.
        </AuthAlert>
      </AuthCard>
    );

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const identity: AuthIdentity | null = claims?.sub
    ? {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
      }
    : null;
  const mode: AuthMode =
    params.view === "sign-up" || params.view === "forgot"
      ? params.view
      : "sign-in";
  const notice =
    params.auth_error === "confirmation_failed"
      ? "This email link could not be verified. It may have expired or already been used. Sign in if you have already confirmed your email; otherwise, return to Create an account to request confirmation."
      : null;
  if (identity && returnTo && mode !== "forgot") redirect(returnTo);
  return (
    <>
      <AuthPanel
        key={mode + (notice ?? "") + (returnTo ?? "")}
        initialIdentity={identity}
        initialNotice={notice}
        initialMode={mode}
        returnTo={returnTo}
      />
      {returnTo && (
        <div className={styles.backNav}>
          <Link href={returnTo} className={styles.textButton}>
            {returnTo === "/my-submissions-preview"
              ? "Back to submissions"
              : "Back to homepage"}
          </Link>
        </div>
      )}
    </>
  );
}
