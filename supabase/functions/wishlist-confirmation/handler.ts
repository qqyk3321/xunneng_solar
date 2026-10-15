import { emailText, wishlistRegion, wishlistTime } from "../_shared/wishlist.ts";

type Client = { from: (table: string) => any }; // Shared by Deno's client and the isolated test adapter.
type Dependencies = { client: Client; env: (key: string) => string | undefined; fetcher?: typeof fetch };
export async function confirmWishlist(request: Request, { client, env, fetcher = fetch }: Dependencies) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (Number(request.headers.get("content-length")) > 1024) return new Response("Too large", { status: 413 });
  let wishlistId: number;
  try {
    const text = await request.text(); if (text.length > 1024) throw Error();
    const input = JSON.parse(text);
    if (Object.keys(input).length !== 1 || !Number.isSafeInteger(input.wishlistId) || input.wishlistId < 1) throw Error();
    wishlistId = input.wishlistId;
  } catch { return new Response("Invalid request", { status: 400 }); }
  const now = new Date().toISOString();
  const templateId = env("RESEND_WISHLIST_TEMPLATE_ID")?.trim();
  const { data: claimed, error: claimError } = await client.from("wishlist_confirmation_emails")
    .update({ status: "sending", attempted_at: now, template_id: templateId || null })
    .eq("wishlist_id", wishlistId).eq("status", "pending").select("id,recipient_email").maybeSingle();
  if (claimError) return new Response("Unavailable", { status: 503 });
  if (!claimed) return Response.json({ ok: true });
  async function finish(values: Record<string, unknown>) {
    const { error } = await client.from("wishlist_confirmation_emails")
      .update({ ...values, completed_at: new Date().toISOString() }).eq("id", claimed.id).eq("status", "sending");
    if (error) throw Error("audit_update_failed");
  }
  try {
    const key = env("RESEND_API_KEY"), from = env("RESEND_FROM_EMAIL");
    if (!key || !from || !templateId) {
      await finish({ status: "failed", error_code: "email_not_configured" });
      return Response.json({ ok: true });
    }
    const { data: row, error } = await client.from("island_wishlist")
      .select("email,island_code,other_island,created_at").eq("id", wishlistId).single();
    if (error || !row || row.email !== claimed.recipient_email) {
      await finish({ status: "failed", error_code: "registration_unavailable" });
      return Response.json({ ok: true });
    }
    const region = wishlistRegion(row.island_code, row.other_island);
    const site = new URL(env("SITE_URL") || "https://www.solortide.com");
    if (site.protocol !== "https:") throw Error("invalid_site_url");
    const body = { from, to: [claimed.recipient_email], template: { id: templateId, variables: {
      REGION_NAME: emailText(region.name), FLAG_URL: `${site.origin}/email-assets/flags/${region.flag}.png`,
      REGISTERED_AT: emailText(wishlistTime(row.created_at, region.zone)),
    } } };
    let response: Response;
    try {
      response = await fetcher("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `wishlist-confirmation/${claimed.id}` },
        body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
      });
    } catch {
      await finish({ status: "unknown", error_code: "provider_result_unconfirmed" });
      return Response.json({ ok: true });
    }
    let providerId: string | null = null;
    try { const result = await response.json(); if (typeof result.id === "string") providerId = result.id; } catch { /* Response ambiguity stays visible in the audit. */ }
    const accepted = response.ok && providerId;
    const ambiguous = response.ok || response.status >= 500 || response.status === 408;
    await finish({ status: accepted ? "accepted" : ambiguous ? "unknown" : "failed", resend_email_id: providerId,
      resend_http_status: response.status, error_code: accepted ? null : ambiguous ? "provider_result_unconfirmed" : `provider_http_${response.status}` });
    return Response.json({ ok: true });
  } catch {
    // No provider secrets or recipient details in logs/responses. A stale sending
    // audit is displayed as unconfirmed by the staff list, never as delivered.
    console.error(JSON.stringify({ event: "wishlist_confirmation_incomplete" }));
    return new Response("Unavailable", { status: 503 });
  }
}
