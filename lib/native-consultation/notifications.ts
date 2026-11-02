import "server-only";
import { emailAccessToken } from "./email-access-token";
import { consultationDatabase, tokenSecret } from "./config";
import { previewPath } from "@solortide/consultation-core/tokens";
import { consultationQrAttachment, linkedPreviewQrHtml } from "@/supabase/functions/_shared/consultation-qr";
import { consultationWhatsAppUrl } from "@/supabase/functions/_shared/whatsapp";
import { regionalTime } from "@/supabase/functions/_shared/submission-time";
import QRCode from "qrcode";
import { PNG } from "pngjs";

type NotificationJob = {
  id: string; consultation_id: string; lease_token: string; first_attempt_at: string;
  delivery_payload: Record<string, unknown> | null;
};

export async function processConsultationNotifications() {
  const env = process.env;
  if (env.CONSULTATION_EMAIL_MODE !== "send") throw Error("Consultation email delivery is disabled");
  const apiKey = env.RESEND_API_KEY, from = env.RESEND_FROM_EMAIL, template = env.RESEND_TEMPLATE_ID;
  const site = new URL(env.CONSULTATION_SITE_URL || "");
  const secret = tokenSecret();
  const localPreview = env.CONSULTATION_ENVIRONMENT === "local" && site.protocol === "http:" && site.origin === new URL(env.SITE_URL || "").origin;
  if (!apiKey || !from || !template || (site.protocol !== "https:" && !localPreview)) throw Error("Consultation mail configuration is incomplete");
  let endpoint = "https://api.resend.com/emails";
  if (env.CONSULTATION_ENVIRONMENT === "local" && env.CONSULTATION_LOCAL_MAIL_ENDPOINT) {
    const local = new URL(env.CONSULTATION_LOCAL_MAIL_ENDPOINT);
    if (!["127.0.0.1", "localhost"].includes(local.hostname) || local.protocol !== "http:") throw Error("Invalid local mail endpoint");
    endpoint = local.href;
  }
  const allowed = (env.CONSULTATION_TEST_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const client = consultationDatabase();
  const { data: jobs, error } = await client.rpc("claim_consultation_notifications", { p_limit: 5 });
  if (error) throw Error("Unable to claim notifications");
  let accepted = 0, pending = 0, failed = 0;
  const results = await Promise.allSettled(((jobs || []) as NotificationJob[]).map(async job => {
    let status = "pending", providerId: string | null = null, providerStatus: number | null = null, reason: string | null = null;
    try {
      // Resend guarantees idempotency for 24 hours. Never blindly re-send a job
      // whose outcome could have become uncertain outside that window.
      if (Date.now() - Date.parse(job.first_attempt_at) > 23 * 3600_000) { status = "failed"; throw Error("Review required: delivery window expired"); }
      const result = await client.from("consultations").select("*").eq("id", job.consultation_id).single();
      if (result.error || !result.data) throw Error("Consultation unavailable");
      const row = result.data;
      if (env.CONSULTATION_ENVIRONMENT !== "production" && !allowed.includes(row.email.toLowerCase())) { status = "failed"; throw Error("Recipient is not on the test allowlist"); }
      const support = row.country_code === "AG" ? env.ANTIGUA_SUPPORT_EMAIL : env.DOMINICA_SUPPORT_EMAIL;
      if (!support) throw Error("Regional support email is not configured");
      let payload = job.delivery_payload;
      if (!payload) {
        const link = new URL(previewPath(row.id, row.country_code, secret), site);
        link.hash = `edit=${emailAccessToken(row.id, row.email, secret)}`;
        const url = link.href;
        payload = { from, to: [row.email], reply_to: [support], subject: `Your consultation · ${row.submission_id} | Sol & Tide Energy`,
          attachments: [await consultationQrAttachment(url, QRCode, PNG)], template: { id: template, variables: {
            SUBMISSION_ID: row.submission_id, WHATSAPP_URL: consultationWhatsAppUrl(row.submission_id, env.WHATSAPP_BASE_URL || undefined),
            RECIPIENT_NAME: row.name, RECIPIENT_EMAIL: row.email, PREVIEW_URL: url, PREVIEW_QR_HTML: linkedPreviewQrHtml(url),
            SUPPORT_EMAIL: support, SUBMITTED_AT: regionalTime(new Date(row.submitted_at), row.country_code).display,
          } } };
        const saved = await client.from("consultation_notifications").update({ delivery_payload: payload }).eq("id", job.id).eq("lease_token", job.lease_token).select("id").maybeSingle();
        if (saved.error || !saved.data) throw Error("Notification lease was lost");
      }
      const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `native-consultation/${job.id}` }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) });
      providerStatus = response.status;
      const body = await response.json().catch(() => ({}));
      if (response.ok && typeof body.id === "string") { status = "accepted"; providerId = body.id; }
      else { status = response.status >= 500 || [408, 429].includes(response.status) || response.ok ? "pending" : "failed"; reason = `Mail provider response ${response.status}`; }
    } catch (error) { reason = error instanceof Error && !error.message.includes("http") ? error.message.slice(0, 200) : "Notification delivery could not be confirmed"; }
    const finished = await client.rpc("finish_consultation_notification", { p_id: job.id, p_lease: job.lease_token, p_status: status, p_provider_id: providerId, p_provider_status: providerStatus, p_error: reason });
    if (finished.error || !finished.data) throw Error("Notification result could not be recorded");
    if (status === "accepted") accepted++; else if (status === "failed") failed++; else pending++;
  }));
  if (results.some(result => result.status === "rejected")) throw Error("Some notification results could not be recorded");
  return { accepted, pending, failed };
}
