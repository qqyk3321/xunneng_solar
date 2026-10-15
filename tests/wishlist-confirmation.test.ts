import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { confirmWishlist } from "../supabase/functions/wishlist-confirmation/handler";
import { saveWishlist } from "../lib/wishlist/save";
import { WISHLIST_REGIONS, wishlistRegion, wishlistTime, emailText } from "../supabase/functions/_shared/wishlist";
import { UPCOMING_ISLANDS } from "../lib/upcoming-islands";

function setup() {
  const audit: Record<string, any> = { id: "test-audit", wishlist_id: 1, status: "pending", recipient_email: "fixture@example.test" };
  const row = { id: 1, email: audit.recipient_email, island_code: "LC", other_island: "", created_at: "2026-10-12T14:30:00Z" };
  const client = { from(table: string) {
    let updates: Record<string, unknown> | undefined; const filters: [string, unknown][] = [];
    const run = () => {
      const source = table === "wishlist_confirmation_emails" ? audit : row;
      if (filters.some(([k, v]) => source[k as keyof typeof source] !== v)) return { data: null, error: null };
      if (updates) Object.assign(source, updates);
      return { data: { ...source }, error: null };
    };
    const query: any = {
      update(v: Record<string, unknown>) { updates = v; return query; }, eq(k: string, v: unknown) { filters.push([k, v]); return query; },
      select() { return query; }, maybeSingle: async () => run(), single: async () => run(),
      then(resolve: (v: unknown) => void) { resolve(run()); },
    };
    return query;
  } };
  const env = (key: string) => ({ RESEND_API_KEY: "test-key", RESEND_WISHLIST_TEMPLATE_ID: "test-template", RESEND_FROM_EMAIL: "sender@example.test", SITE_URL: "https://www.solortide.com" } as Record<string, string>)[key];
  return { audit, row, client, env };
}
const request = (body: unknown = { wishlistId: 1 }) => new Request("https://example.test", { method: "POST", body: JSON.stringify(body) });

test("wishlist confirmation claims once and uses only stored recipient, region and registration time", async () => {
  const s = setup(); const calls: RequestInit[] = [];
  const fetcher: typeof fetch = async (_url, init) => { calls.push(init!); return Response.json({ id: "provider-id" }); };
  await Promise.all([confirmWishlist(request(), { ...s, fetcher }), confirmWishlist(request(), { ...s, fetcher })]);
  assert.equal(calls.length, 1); assert.equal(s.audit.status, "accepted"); assert.equal(s.audit.resend_email_id, "provider-id");
  const payload = JSON.parse(calls[0].body as string);
  assert.deepEqual(payload.to, [s.row.email]); assert.equal(payload.template.variables.REGION_NAME, "St Lucia");
  assert.match(payload.template.variables.FLAG_URL, /\/lc\.png$/); assert.match(payload.template.variables.REGISTERED_AT, /10:30.*GMT-4/);
  assert.equal(new Headers(calls[0].headers).get("Idempotency-Key"), "wishlist-confirmation/test-audit");
});

test("provider rejection, timeout and ambiguous responses persist distinguishable results; no resend", async () => {
  for (const [status, fetcher] of [
    ["failed", async () => Response.json({ message: "bad" }, { status: 422 })],
    ["unknown", async () => { throw Error("timeout"); }],
    ["unknown", async () => new Response("unavailable", { status: 503 })],
    ["unknown", async () => Response.json({})],
  ] as const) {
    const s = setup(); let calls = 0;
    const send: typeof fetch = async () => { calls++; return fetcher(); };
    assert.equal((await confirmWishlist(request(), { ...s, fetcher: send })).status, 200);
    assert.equal(s.audit.status, status); assert.ok(s.audit.completed_at); assert.ok(s.audit.error_code);
    await confirmWishlist(request(), { ...s, fetcher: send }); assert.equal(calls, 1);
  }
});

test("invalid requests, missing audit/config and recipient changes never send", async () => {
  for (const body of [{ wishlistId: 1, email: "override@example.test" }, { wishlistId: -1 }, { wishlistId: "1" }, null]) {
    const s = setup(); assert.equal((await confirmWishlist(request(body), { ...s, fetcher: async () => { throw Error("must not send"); } })).status, 400);
    assert.equal(s.audit.status, "pending");
  }
  const missing = setup(); await confirmWishlist(request(), { ...missing, env: () => undefined }); assert.equal(missing.audit.status, "failed");
  const changed = setup(); changed.row.email = "different@example.test"; await confirmWishlist(request(), changed); assert.equal(changed.audit.error_code, "registration_unavailable");
  const absent = setup(); let calls = 0; await confirmWishlist(request({ wishlistId: 2 }), { ...absent, fetcher: async () => { calls++; return Response.json({}); } }); assert.equal(calls, 0);
});

test("region assets cover every supported island; Other is escaped and uses UTC", () => {
  assert.deepEqual(Object.keys(WISHLIST_REGIONS).sort(), Object.keys(UPCOMING_ISLANDS).sort());
  for (const [code, entry] of Object.entries(WISHLIST_REGIONS)) {
    assert.equal(entry.name, UPCOMING_ISLANDS[code as keyof typeof UPCOMING_ISLANDS]);
    assert.ok(readFileSync(`public/email-assets/flags/${entry.flag}.png`).length > 0);
    assert.ok(wishlistTime("2026-10-12T14:30:00Z", entry.zone));
  }
  assert.deepEqual(wishlistRegion("OTHER", "My island"), { name: "My island", flag: "other", zone: "UTC" });
  assert.equal(emailText('A & "B" <test>'), 'A &amp; &quot;B&quot; &lt;test&gt;');
  assert.throws(() => wishlistRegion("__proto__", ""));
});

test("site duplicate never dispatches; dispatch failure cannot erase registration or overwrite a claimed audit", async () => {
  for (const fresh of [false, true]) {
    let calls = 0;const filters: unknown[] = [];
    const query: any = { select: () => query, maybeSingle: async () => ({ data: fresh ? { id: 7 } : null, error: null }), eq: (...args: unknown[]) => { filters.push(args); return query; }, then: (resolve: (value: unknown) => void) => resolve({ error: null }) };
    const client: any = { from: () => ({ upsert: () => query, update: () => query }) };
    await saveWishlist({ email: "fixture@example.test", islandCode: "LC", otherIsland: "" }, client, "https://example.test", "server-key", async (_url, init) => {
      calls++;assert.equal(new Headers(init?.headers).get("apikey"), "server-key");throw Error("dispatch timeout");
    });
    assert.equal(calls, fresh ? 1 : 0);if (fresh) assert.deepEqual(filters, [["wishlist_id", 7], ["status", "pending"]]);
  }
});

test("edge authentication is server-only and registration audit is atomic without a historical backfill", () => {
  assert.match(readFileSync("supabase/functions/wishlist-confirmation/index.ts", "utf8"), /auth: "secret:\*"/);
  const sql = readFileSync("supabase/migrations/20261012055701_add_wishlist_confirmation_email.sql", "utf8");
  assert.match(sql, /enable row level security/); assert.match(sql, /revoke all.*anon, authenticated/);
  assert.match(sql, /after insert on public.island_wishlist/); assert.match(sql, /wishlist_id bigint not null unique/);
  assert.doesNotMatch(sql, /security definer|insert into.*select.*island_wishlist/is);
});
