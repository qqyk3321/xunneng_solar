import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-auth/server";

const allowedOtpTypes = new Set<EmailOtpType>([
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
]);

function safeNextPath(value: string | null) {
  return value === "/auth-preview/update-password" ? value : "/auth-preview";
}

function redirectWithinPreview(path: string) {
  // Keep the browser's current origin; request.url can use the internal
  // listening host (0.0.0.0) in development or behind a reverse proxy.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new NextResponse(null, { status: 404 });
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");
  const next =
    rawType === "recovery"
      ? "/auth-preview/update-password"
      : safeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();
  let error: Error | null = null;

  if (tokenHash && rawType && allowedOtpTypes.has(rawType as EmailOtpType)) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as EmailOtpType,
    });
    error = result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else {
    error = new Error("Missing confirmation token.");
  }

  if (error) {
    return redirectWithinPreview(
      next === "/auth-preview/update-password"
        ? "/auth-preview/update-password?auth_error=recovery_failed"
        : "/auth-preview?auth_error=confirmation_failed",
    );
  }

  return redirectWithinPreview(next);
}
