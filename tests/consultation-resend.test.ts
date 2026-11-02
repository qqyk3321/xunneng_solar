import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resendConsultation, validPreview } from "../supabase/functions/staff-resend-consultation/handler";
import sharp from "sharp";
import jsQR from "jsqr";

const token = "a".repeat(43), hash = createHash("sha256").update(token).digest("hex");
const previewUrl = `https://www.solortide.com/antigua/submission/${token}`;
const input = { submissionId: "49", requestId: "11111111-1111-4111-8111-111111111111", actorId: "22222222-2222-4222-8222-222222222222", actorEmail: "staff@example.test", previewUrl };
const row = { id: 49, email: "customer@example.test", name: "Customer", submission_id: "M1lKO1l", country_code: "AG", submitted_at: "2026-10-09T06:39:00Z" };
const environment: Record<string, string> = { RESEND_API_KEY: "test-key", RESEND_TEMPLATE_ID: "existing-template", RESEND_FROM_EMAIL: "Solortide <hello@example.test>", ANTIGUA_SUPPORT_EMAIL: "ag-support@example.test", DOMINICA_SUPPORT_EMAIL: "dm-support@example.test" };
function fixture() {
  const state = { status: "send", payload: null as unknown, row: { ...row }, tokenHash: hash, claimCount: 0, sends: [] as {headers: Headers; body: Record<string, unknown>}[], updates: [] as Record<string, unknown>[], updateError: false };
  const client = {
    from(table: string) {
      const q = { select() { return this; }, eq() { return this; },
        update(value: Record<string, unknown>) { state.updates.push(value); return this; },
        async maybeSingle() { return { data: table === "tally_form_submissions" ? state.row : { token_hash: state.tokenHash }, error: null }; },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve({ error: state.updateError ? "unavailable" : null }).then(resolve); },
      }; return q;
    },
    async rpc(_name: string, args: Record<string, unknown>) {
      state.claimCount++;
      return { data: { status: state.status, request_id: input.requestId, payload: state.payload || args.p_payload }, error: null };
    },
  };
  const send: typeof fetch = async (_url, init) => {
    state.sends.push({ headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
    return Response.json({ id: "provider-id" });
  };
  const call = (body: unknown = input, sender = send) => resendConsultation(new Request("https://test.invalid", { method: "POST", body: JSON.stringify(body) }), { client, env: n => environment[n], send: sender });
  return { state, call };
}

test("resends use the stored recipient, existing template, original time and verified preview", async () => {
  const { state, call } = fixture();
  assert.equal((await (await call()).json()).status, "accepted");
  const sent = state.sends[0];
  assert.equal(sent.headers.get("idempotency-key"), `consultation-resend/${input.requestId}`);
  assert.deepEqual(sent.body.to, [row.email]);
  const template = sent.body.template as { id: string; variables: Record<string, string> };
  assert.equal(template.id, environment.RESEND_TEMPLATE_ID);
  assert.equal(template.variables.SUBMISSION_ID, row.submission_id);
  assert.ok(new URL(template.variables.WHATSAPP_URL).searchParams.get("text")?.endsWith(`Submission ID: ${row.submission_id}`));
  assert.equal(template.variables.PREVIEW_URL, previewUrl);
  const attachment = (sent.body.attachments as {content: string; content_id: string}[])[0];
  assert.ok(template.variables.PREVIEW_QR_HTML.includes(`cid:${attachment.content_id}`));
  const { data, info } = await sharp(Buffer.from(attachment.content, "base64")).resize(200, 200).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, previewUrl);
  assert.equal(template.variables.SUBMITTED_AT, "9 Oct 2026 · 2:39 AM AST");
  assert.ok(!("QUOTE_XCD" in template.variables)); assert.ok(!("REPLY_DEADLINE" in template.variables));
  assert.equal(state.updates[0].status, "accepted");
});

test("malformed requests, recipient overrides and revoked/wrong-region previews never send", async () => {
  for (const bad of [null, { ...input, email: "attacker@example.test" }, { ...input, requestId: "bad" }, { ...input, submissionId: "1 or 1=1" }, { ...input, previewUrl: previewUrl.replace("antigua", "dominica") }]) {
    const { state, call } = fixture(); await call(bad);
    assert.equal(state.sends.length, 0); assert.equal(state.claimCount, 0);
  }
  assert.equal(await validPreview(previewUrl, "AG", "revoked", "https://www.solortide.com"), false);
  for (const bad of [previewUrl+"?x=1",previewUrl+"#x",previewUrl.replace("www.solortide.com", "evil.test"),previewUrl.replace("https:", "http:")])
    assert.equal(await validPreview(bad,"AG",hash,"https://www.solortide.com"),false);
});

test("completed, in-flight, cooldown and expired-uncertain claims do not call the provider", async () => {
  for (const status of ["accepted", "pending", "cooldown", "uncertain", "failed"]) {
    const { state, call } = fixture(); state.status = status;
    assert.equal((await (await call()).json()).status, status);
    assert.equal(state.sends.length, 0);
  }
});

test("retries use the stored exact payload and ambiguous outcomes remain pending", async () => {
  const { state, call } = fixture();
  state.payload = { from: "original", to: [row.email], template: { id: "original-template", variables: { PREVIEW_URL: previewUrl } } };
  await call(); assert.deepEqual(state.sends[0].body, state.payload);
  const changedRecipient = fixture();
  changedRecipient.state.payload = { to: ["old@example.test"], template: { variables: { PREVIEW_URL: previewUrl } } };
  assert.equal((await (await changedRecipient.call()).json()).status, "uncertain");
  assert.equal(changedRecipient.state.sends.length, 0);
  for (const code of [409, 429, 502]) {
    const f = fixture();
    assert.equal((await (await f.call(input, async()=>Response.json({}, {status:code}))).json()).status, "pending");
    assert.equal(f.state.updates.length, 0);
  }
  const network = fixture();
  assert.equal((await (await network.call(input, async()=>{throw new Error("network");})).json()).status,"pending");
  const denied = fixture();
  assert.equal((await (await denied.call(input, async()=>Response.json({},{status:422}))).json()).status,"failed");
  const audit = fixture(); audit.state.updateError=true;
  assert.equal((await (await audit.call()).json()).status,"pending");
});
