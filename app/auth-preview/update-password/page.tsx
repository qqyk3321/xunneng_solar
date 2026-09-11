import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { isSupabaseAuthConfigured } from "@/lib/supabase-auth/config";
import { createClient } from "@/lib/supabase-auth/server";
import { AuthCard, AuthResult } from "../auth-ui";
import styles from "../auth-preview.module.css";
import { UpdatePasswordForm } from "./update-password-form";
import { previewReturnPath } from "@/lib/supabase-auth/return-path";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo = previewReturnPath(params.returnTo);
  let authenticated = false;
  if (isSupabaseAuthConfigured() && params.auth_error !== "recovery_failed") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    authenticated = Boolean(data?.claims?.sub);
  }
  return (
    <AuthCard accent>
      {authenticated ? (
        <UpdatePasswordForm returnTo={returnTo} />
      ) : (
        <AuthResult
          kind="expired"
          title="Let’s Get You a New Link"
          description="We couldn’t verify a password reset session. Your link may have expired, already been used, or been opened in another browser."
        >
          <Link href="/auth-preview?view=forgot" className={styles.amberButton}>
            <RefreshCw size={18} aria-hidden="true" />
            Request new reset link
          </Link>
          <Link
            href={returnTo ?? "/auth-preview"}
            className={styles.textButton}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {returnTo ? "Back to homepage" : "Back to account access"}
          </Link>
        </AuthResult>
      )}
    </AuthCard>
  );
}
