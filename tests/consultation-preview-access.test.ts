import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadConsultationPreview } from "../lib/consultation-preview";

test("preview access requires a matching stored hash, not an expiry or submission ID", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://preview-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
  const token = "a".repeat(43);
  let stored = true;
  let calls = 0;
  const submission = { country_code: "AG", submitted_at: "2020-01-01T00:00:00Z" };
  globalThis.fetch = async (input, init) => {
    calls++;
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.pathname, "/rest/v1/consultation_preview_tokens");
    assert.equal(init?.cache, "no-store");
    assert.ok(url.searchParams.get("select")?.includes("monthly_kwh,consumption_profile"));
    assert.equal(url.searchParams.has("expires_at"), false);
    assert.equal(url.searchParams.get("token_hash"), `eq.${createHash("sha256").update(token).digest("hex")}`);
    return new Response(JSON.stringify(stored ? [{ tally_form_submissions: submission }] : []), {
      headers: { "content-type": "application/json" },
    });
  };
  try {
    assert.equal(await loadConsultationPreview("12345"), null);
    assert.equal(calls, 0, "a submission ID must not grant access");
    assert.deepEqual(await loadConsultationPreview(token), submission, "old submissions remain accessible");
    stored = false;
    assert.equal(await loadConsultationPreview(token), null, "a deleted token cannot grant access");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test("permanent-link migration preserves token hashes, records and restricted access", () => {
  const sql = readFileSync("supabase/migrations/20260918085300_permanent_consultation_preview_links.sql", "utf8");
  assert.match(sql, /alter column expires_at set default 'infinity'::timestamptz/);
  assert.match(sql, /set expires_at = 'infinity'::timestamptz/);
  assert.doesNotMatch(sql, /\b(delete from|drop table|disable row level security|grant)\b/i);
  const webhook = readFileSync("supabase/functions/tally-webhook/index.ts", "utf8");
  assert.match(webhook, /expires_at: "infinity"/);
  assert.match(webhook, /name: "HMAC", hash: "SHA-256"/);
  assert.match(webhook, /token_hash: await hash\(token\)/);
  assert.doesNotMatch(webhook, /30 \* 24 \* 60 \* 60/);
});
