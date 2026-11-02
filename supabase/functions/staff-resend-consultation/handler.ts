import { consultationWhatsAppUrl } from "../_shared/whatsapp.ts";
import { consultationQrAttachment, PREVIEW_QR_HTML } from "../_shared/consultation-qr.ts";
import QRCode from "qrcode";
import { PNG } from "pngjs";
import { regionalTime } from "../tally-webhook/submission-time.ts";

type Client = {
  // Supabase's fluent query builder is injected for the Node/Deno contract tests.
  // deno-lint-ignore no-explicit-any
  from(table: string): any;
  // deno-lint-ignore no-explicit-any
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: any; error: unknown }>;
};
type Dependencies = { client: Client; env: (name: string) => string | undefined; send?: typeof fetch };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const reply = (status: string, extra: Record<string, unknown> = {}, http = 200) =>
  Response.json({ status, ...extra }, { status: http, headers: { "Cache-Control": "no-store" } });

export async function validPreview(url: unknown, country: string, storedHash: string, site: string) {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    const prefix = `/${country === "AG" ? "antigua" : "dominica"}/submission/`;
    if (parsed.origin !== new URL(site).origin || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.startsWith(prefix)) return false;
    const token = parsed.pathname.slice(prefix.length);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, "0")).join("") === storedHash;
  } catch { return false; }
}

// Called only after the Edge entrypoint authenticates a server secret key.
export async function resendConsultation(req: Request, { client, env, send = fetch }: Dependencies): Promise<Response> {
  if (req.method !== "POST") return reply("invalid", {}, 405);
  let input;
  try {
    const text = await req.text();
    if (text.length > 4096) return reply("invalid", {}, 400);
    input = JSON.parse(text);
  } catch { return reply("invalid", {}, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).some(key => !["submissionId", "requestId", "actorId", "actorEmail", "previewUrl"].includes(key))
    || !/^[1-9]\d{0,18}$/.test(String(input.submissionId))
    || typeof input.requestId !== "string" || !uuid.test(input.requestId)
    || typeof input.actorId !== "string" || !uuid.test(input.actorId)
    || typeof input.actorEmail !== "string" || input.actorEmail.length > 254 || !email.test(input.actorEmail)) return reply("invalid", {}, 400);
  try {
    const { data: row, error } = await client.from("tally_form_submissions")
      .select("id,submission_id,email,name,country_code,submitted_at")
      .eq("id", input.submissionId).maybeSingle();
    if (error) return reply("unavailable", {}, 503);
    if (!row) return reply("unavailable", {}, 404);
    if (!email.test(row.email) || row.email.length > 254 || !["AG", "DM"].includes(row.country_code)
      || !/^[A-Za-z0-9_-]{1,200}$/.test(row.submission_id) || !Number.isFinite(Date.parse(row.submitted_at))) return reply("unavailable", {}, 422);
    const { data: token, error: tokenError } = await client.from("consultation_preview_tokens")
      .select("token_hash").eq("tally_submission_row_id", row.id).maybeSingle();
    const site = env("SITE_URL") || "https://www.solortide.com";
    if (tokenError || !token || !await validPreview(input.previewUrl, row.country_code, token.token_hash, site)) return reply("unavailable", {}, 422);
    const apiKey = env("RESEND_API_KEY"), templateId = env("RESEND_TEMPLATE_ID"), from = env("RESEND_FROM_EMAIL");
    const support = env(row.country_code === "AG" ? "ANTIGUA_SUPPORT_EMAIL" : "DOMINICA_SUPPORT_EMAIL");
    if (!apiKey || !templateId || !from || !support) return reply("unavailable", {}, 503);
    // Use the existing hosted template. It links to the current quote; no price
    // or new reply deadline is inserted into an old consultation's email.
    const payload = {
      from, to: [row.email], reply_to: [support],
      subject: `Your consultation · ${row.submission_id} | Sol & Tide Energy`,
      attachments: [await consultationQrAttachment(input.previewUrl, QRCode, PNG)],
      template: { id: templateId, variables: {
        WHATSAPP_URL: consultationWhatsAppUrl(row.submission_id, env("WHATSAPP_BASE_URL") || undefined),
        SUBMISSION_ID: row.submission_id, RECIPIENT_NAME: row.name || "there",
        RECIPIENT_EMAIL: row.email, PREVIEW_URL: input.previewUrl, SUPPORT_EMAIL: support,
        PREVIEW_QR_HTML,
        SUBMITTED_AT: regionalTime(row.submitted_at, row.country_code).display,
      } },
    };
    const { data: claim, error: claimError } = await client.rpc("claim_consultation_email_resend", {
      p_request_id: input.requestId, p_submission_id: row.id,
      p_actor_id: input.actorId, p_actor_email: input.actorEmail, p_payload: payload,
    });
    if (claimError || !claim) return reply("unavailable", {}, 503);
    const info = { requestId: claim.request_id, retryAfter: claim.retry_after || 0 };
    if (claim.status !== "send") return reply(claim.status, info);
    // Stored payloads make retries identical. A revoked preview must never be resent.
    if (!Array.isArray(claim.payload?.to) || claim.payload.to.length !== 1 || claim.payload.to[0] !== row.email
      || !await validPreview(claim.payload?.template?.variables?.PREVIEW_URL, row.country_code, token.token_hash, site)) return reply("uncertain", info);
    let response: Response;
    try {
      response = await send("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(7000),
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": `consultation-resend/${claim.request_id}` },
        body: JSON.stringify(claim.payload),
      });
    } catch { return reply("pending", { ...info, retryAfter: 15 }); }
    let body;
    try { body = await response.json(); } catch { body = null; }
    const accepted = response.ok && typeof body?.id === "string";
    // Transient/ambiguous errors retain the same payload and provider key.
    const failed = !response.ok && response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status);
    if (!accepted && !failed) return reply("pending", { ...info, retryAfter: 15 });
    const { error: updateError } = await client.from("consultation_email_resends")
      .update({ status: accepted ? "accepted" : "failed", resend_email_id: accepted ? body.id : null,
        provider_status: response.status, completed_at: new Date().toISOString() })
      .eq("request_id", claim.request_id).eq("status", "pending");
    if (updateError) return reply("pending", { ...info, retryAfter: 15 });
    return reply(accepted ? "accepted" : "failed", { ...info, retryAfter: 60 });
  } catch { return reply("unavailable", {}, 503); }
}
