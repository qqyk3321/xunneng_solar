import "server-only";
import { createClient } from "@supabase/supabase-js";
export function nativeEnabled() { return process.env.NATIVE_CONSULTATION_ENABLED === "true"; }
export function consultationDatabase() {
  const url = process.env.CONSULTATION_DATABASE_URL?.trim(), key = process.env.CONSULTATION_DATABASE_KEY?.trim();
  // Never fall back to the existing production credentials in a preview.
  if (!nativeEnabled() || !url || !key) throw Error("Native consultation database is not configured");
  const production = process.env.CONSULTATION_ENVIRONMENT === "production";
  if (url.includes("thiqsnscgdjwihcfpomw") && (!production || process.env.VERCEL_ENV !== "production")) throw Error("Production consultation database is disabled in previews");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(12_000) }),
  } });
}
export function tokenSecret() {
  const secret = process.env.CONSULTATION_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) throw Error("Consultation token secret is not configured");
  return secret;
}
