import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { parseEnergyInput, PROFILE_OPTIONS } from "../supabase/functions/tally-webhook/energy-input";
import { calculateQuote } from "../supabase/functions/tally-webhook/quote-engine.js";
import { DEFAULT_PRICING, estimateQuoteXcd } from "../lib/quote-pricing/model";
import { optimizeSystem, PROFILES } from "../lib/solution-suggest/optimizer";
import { FIELD_NAMES } from "../supabase/functions/tally-webhook/intake";
import sharp from "sharp";
import jsQR from "jsqr";

test("all four Tally option IDs map explicitly; malformed input and old electrical options fail", () => {
  for (const [id, profile] of Object.entries(PROFILE_OPTIONS)) {
    assert.deepEqual(parseEnergyInput(300.5, [id]), { monthly_kwh: 300.5, consumption_profile: profile });
    assert.equal(parseEnergyInput(" 300.5 ", [id]).monthly_kwh, 300.5);
  }
  const id = Object.keys(PROFILE_OPTIONS)[0];
  for (const value of [null, undefined, "", " ", true, -1, 0, Infinity, "1e3", "2,000", 1000001])
    assert.throws(() => parseEnergyInput(value, [id]));
  for (const value of [null, [], [id, id], ["Single phase"], ["Daytime use"], ["daytime"], id])
    assert.throws(() => parseEnergyInput(300, value));
});

test("deployed bundle matches the page's recommendation and current pricing for every profile", () => {
  const manifest = JSON.parse(readFileSync("lib/solution-suggest/model-table-manifest.json", "utf8"));
  const model = JSON.parse(readFileSync(`public${manifest.url}`, "utf8")).models.find(m => m.id === "antigua/south/tilt-20" && m.source === "pvwatts");
  for (const [profile, monthlyKwh] of [["daytime", 2000], ["rush", 750], ["evening", 1200], ["night", 300]] as const) {
    const pricing = { ...DEFAULT_PRICING, price_multiplier: 3.7 };
    const plan = optimizeSystem(model, monthlyKwh, PROFILES[profile].values);
    assert.equal(calculateQuote(monthlyKwh, profile, pricing), estimateQuoteXcd(pricing, plan));
  }
});

test("signed webhook sends only the detail link, requires no pricing data and skips accepted mail", async () => {
  const fields = Object.fromEntries([...FIELD_NAMES, "full_address", "monthly_kwh", "consumption_profile"].map(k => [k, `question_${k}`]));
  const config = { formId: "TEST", fields };
  const env = {
    TALLY_SIGNING_SECRET: "unit-only", TALLY_INTAKE_ENABLED: "true", TALLY_INTAKE_CONFIG: JSON.stringify(config),
    SUPABASE_URL: "https://database.example", SUPABASE_SERVICE_ROLE_KEY: "unit-only",
    WHATSAPP_BASE_URL: "https://wa.me/12680000001",
    RESEND_API_KEY: "unit-only", RESEND_TEMPLATE_ID: "template", RESEND_FROM_EMAIL: "team@example.com",
    ANTIGUA_SUPPORT_EMAIL: "ag@example.com", DOMINICA_SUPPORT_EMAIL: "dm@example.com",
  };
  const receivedAt = "2026-10-08T12:00:00Z";
  let stored: Record<string, unknown> | undefined, accepted = false, failSend = true;
  const mails: Record<string, any>[] = [], audits: Record<string, unknown>[] = [];
  const fakeFetch = async (input, init) => {
    const url = new URL(input), body = init?.body ? JSON.parse(init.body) : undefined;
    const method = init?.method ?? "GET";
    if (url.hostname === "api.resend.com") {
      mails.push(body);
      return Response.json(failSend ? { error: "temporary failure" } : { id: "mail-1" }, { status: failSend ? 503 : 200 });
    }
    assert.equal(url.hostname, "database.example", "No real network access");
    const table = url.pathname.split("/").at(-1);
    if (table === "tally_form_submissions") {
      if (method === "POST") {
        if (stored) return Response.json({ code: "23505" }, { status: 409 });
        assert.equal(body.confirmation_pricing, undefined);
        stored = { ...body, id: 1, received_at: receivedAt };
        return Response.json(stored, { status: 201 });
      }
      return Response.json(stored);
    }
    if (table === "consultation_preview_tokens") return new Response(null, { status: 201 });
    if (table === "consultation_email_audit") {
      if (method === "GET") return Response.json(accepted ? [{ id: 1 }] : []);
      audits.push(body);
      if (method === "POST") return Response.json({ id: audits.length }, { status: 201 });
      if (body.status === "accepted") accepted = true;
      return new Response(null, { status: 204 });
    }
    assert.fail(`Unexpected request ${table}`);
  };
  const require = createRequire(import.meta.url);
  const bundle = await build({
    entryPoints: ["supabase/functions/tally-webhook/index.ts"], bundle: true, write: false, format: "cjs", platform: "node",
    external: ["qrcode", "pngjs"],
    plugins: [{ name: "edge-imports", setup(build) {
      build.onResolve({ filter: /^jsr:/ }, () => ({ path: "runtime", namespace: "empty" }));
      build.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "" }));
      build.onResolve({ filter: /^npm:/ }, () => ({ path: "@supabase/supabase-js", external: true }));
    } }],
  });
  let handler: (request: Request) => Promise<Response>;
  runInNewContext(bundle.outputFiles[0].text, {
    require, crypto: webcrypto, TextEncoder, TextDecoder, Request, Response, URL, AbortSignal, btoa, atob,
    fetch: fakeFetch, console: { ...console, error: () => {} },
    Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } },
  });
  const values = { installation_country: "AG", name: "Test", email: "delivered@resend.dev", phone: "+12680000000",
    full_address: "Test address", monthly_kwh: 300, consumption_profile: [Object.keys(PROFILE_OPTIONS)[3]] };
  const payload = { eventId: "event", eventType: "FORM_RESPONSE", data: { formId: "TEST", submissionId: "test-1", createdAt: receivedAt,
    fields: Object.entries(values).map(([key, value]) => ({ key: fields[key], value })) } };
  const invoke = () => {
    const body = JSON.stringify(payload);
    return handler(new Request("https://webhook.example", { method: "POST", body, headers: { "content-type": "application/json", "tally-signature": createHmac("sha256", env.TALLY_SIGNING_SECRET).update(body).digest("base64") } }));
  };
  assert.equal((await invoke()).status, 503);
  assert.equal(stored?.monthly_kwh, 300);
  assert.equal(stored?.consumption_profile, "night");
  const whatsapp = new URL(mails[0].template.variables.WHATSAPP_URL);
  assert.equal(whatsapp.pathname, "/12680000001");
  assert.equal(whatsapp.searchParams.get("text"), "Hi Sol & Tide, I'd like to discuss my preliminary quote.\nSubmission ID: test-1");
  assert.equal(mails[0].template.variables.QUOTE_XCD, undefined);
  assert.equal(mails[0].template.variables.REPLY_DEADLINE, undefined);
  assert.match(mails[0].template.variables.PREVIEW_URL, /\/antigua\/submission\//);
  const qr = mails[0].attachments[0];
  assert.ok(mails[0].template.variables.PREVIEW_QR_HTML.includes(`cid:${qr.content_id}`));
  const { data: pixels, info } = await sharp(Buffer.from(qr.content, "base64")).resize(200, 200).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(jsQR(new Uint8ClampedArray(pixels), info.width, info.height)?.data, mails[0].template.variables.PREVIEW_URL);
  assert.ok(!Object.keys(stored!).some(key => /quote|equipment|plan|price/.test(key)));
  assert.ok(!JSON.stringify(audits).includes("22,200"));
  failSend = false;
  // Duplicate payload cannot replace the canonical stored recipient or demand.
  payload.data.fields.find(f => f.key === fields.monthly_kwh)!.value = 2000;
  payload.data.fields.find(f => f.key === fields.email)!.value = "changed@example.com";
  const retry = await invoke();
  assert.equal(retry.status, 200);
  assert.deepEqual(mails[1], mails[0]);
  assert.deepEqual(await retry.json(), { ok: true, duplicate: true });
  assert.equal((await invoke()).status, 200);
  assert.equal(mails.length, 2);
  accepted = false;
  assert.equal((await invoke()).status, 200, "Email delivery does not depend on a price or snapshot");
  assert.equal(mails.length, 3);
});
