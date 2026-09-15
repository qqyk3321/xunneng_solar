import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export type ConsultationPreview = {
  country_code: "AG" | "DM";
  name: string;
  email: string;
  phone: string;
  address: Record<string, string | null>;
};

export async function loadConsultationPreview(token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data } = await client
    .from("consultation_preview_tokens")
    .select(
      "expires_at, tally_form_submissions(country_code, name, email, phone, address, submitted_at, received_at)",
    )
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  const submission = data?.tally_form_submissions as
    ConsultationPreview | null | undefined;
  return submission ?? null;
}
