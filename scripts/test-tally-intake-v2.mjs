// Explicit opt-in real writes to the NEW project only. Never sends mail or changes Tally.
// Temporarily enables a synthetic form mapping, then restores the disabled config.
// Run: TALLY_V2_LIVE_TEST=1 node --env-file=.env.tally-intake-v2 scripts/test-tally-intake-v2.mjs
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const ref = "thiqsnscgdjwihcfpomw";
const base = `https://${ref}.supabase.co`;
if (process.env.TALLY_V2_LIVE_TEST !== "1") throw new Error("Live test requires explicit opt-in");
if (!process.env.TALLY_SIGNING_SECRET) throw new Error("Load the private signing-secret environment file");
function cli(args) {
  return execFileSync("supabase", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
}
const names = ["installation_country", "name", "email", "phone", "parish", "town", "street", "building", "directions"];
const config = { formId: "V2TEST", fields: Object.fromEntries(names.map(name => [name, `test_${name}`])) };
const run = randomUUID();
function payload(country) {
  const values = { installation_country: country, name: "V2 Integration Test", email: "integration-test@example.com", phone: "+1 767 000 0000", parish: "Example Parish", town: "Example Town", street: "Example Area", building: "", directions: "Test only\nNo real customer" };
  return { eventType: "FORM_RESPONSE", eventId: randomUUID(), data: { formId: config.formId, submissionId: `v2-test-${run}-${country}`, createdAt: new Date().toISOString(), fields: names.map(name => ({ key: config.fields[name], label: "Test", value: values[name] })) } };
}
async function post(value, signature) {
  const body = JSON.stringify(value);
  return fetch(`${base}/functions/v1/tally-webhook`, { method: "POST", headers: { "content-type": "application/json", "tally-signature": signature ?? createHmac("sha256", process.env.TALLY_SIGNING_SECRET).update(body).digest("base64") }, body, signal: AbortSignal.timeout(15000) });
}
assert.equal((await post(payload("AG"))).status, 503, "Refuse to overwrite an already-enabled intake configuration");
try {
  cli(["secrets", "set", "TALLY_INTAKE_ENABLED=true", `TALLY_INTAKE_CONFIG=${JSON.stringify(config)}`, "--project-ref", ref]);
  const ag = payload("AG"), dm = payload("DM");
  for (const input of [ag, dm]) {
    const response = await post(input);
    assert.equal(response.status, 200, await response.text());
  }
  const retry = await post(ag);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).duplicate, true);
  assert.equal((await post(ag, "x".repeat(44))).status, 401);
  const badCountry = payload("FR");
  assert.equal((await post(badCountry)).status, 400);
  const badPhone = payload("AG"); badPhone.data.fields.find(f => f.key === config.fields.phone).value = "";
  assert.equal((await post(badPhone)).status, 400);
  const keysResult = JSON.parse(cli(["projects", "api-keys", "--project-ref", ref, "--output-format", "json"]));
  const keys = keysResult.keys ?? keysResult;
  const service = keys.find(key => key.name === "service_role").api_key;
  const anon = keys.find(key => key.name === "anon").api_key;
  const query = new URL(`${base}/rest/v1/tally_form_submissions`);
  query.searchParams.set("submission_id", `like.v2-test-${run}-%`);
  query.searchParams.set("select", "country_code,country_name,name,email,phone,address");
  const read = await fetch(query, { headers: { apikey: service, authorization: `Bearer ${service}` } });
  assert.equal(read.status, 200);
  const rows = await read.json();
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.country_name, row.country_code === "AG" ? "Antigua and Barbuda" : "Dominica");
    assert.equal(row.phone, "+1 767 000 0000");
    assert.equal(row.address.building, null);
    assert.equal(row.address.directions, "Test only\nNo real customer");
  }
  const denied = await fetch(query, { headers: { apikey: anon, authorization: `Bearer ${anon}` } });
  assert.ok([401, 403].includes(denied.status), "Anonymous read must be denied");
  const deniedWrite = await fetch(`${base}/rest/v1/tally_form_submissions`, { method: "POST", headers: { apikey: anon, authorization: `Bearer ${anon}`, "content-type": "application/json" }, body: "{}" });
  assert.ok([401, 403].includes(deniedWrite.status), "Anonymous write must be denied");
  console.log(JSON.stringify({ ok: true, project: ref, testRowsKept: 2, run, checks: ["AG", "DM", "field extraction", "address newlines", "duplicate", "invalid signature", "invalid country", "missing phone", "anonymous read/write denied"] }));
} finally {
  cli(["secrets", "set", "--env-file", ".env.tally-intake-v2", "--project-ref", ref]);
  const disabled = await post(payload("AG"));
  assert.equal(disabled.status, 503, "Intake must remain disabled until real mapping is configured");
  console.log("Restored disabled intake; production Tally and website unchanged.");
}
