import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export type ConsultationPreview = {
  submission_id: string;
  country_code: "AG" | "DM";
  name: string;
  email: string;
  phone: string;
  address: Record<string, string | null>;
  preview_url: string | null;
  submitted_at: string;
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
      "tally_form_submissions(submission_id, country_code, name, email, phone, address, submitted_at, preview_url:payload->data->>submissionPreviewUrl)",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();
  const submission = data?.tally_form_submissions as
    ConsultationPreview | null | undefined;
  return submission ?? null;
}
