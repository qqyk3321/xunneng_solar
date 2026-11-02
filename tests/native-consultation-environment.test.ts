import test from "node:test";
import assert from "node:assert/strict";
import { requestEnvironment } from "../lib/native-consultation/request-environment";
import { submissionSchema } from "../lib/native-consultation/schema";
import { createSubmissionHandler } from "../lib/native-consultation/handler";
import { PRIVACY_VERSION } from "@solortide/consultation-core";
import { randomUUID } from "node:crypto";

const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
test("only trusted edge IP is recorded; user agent is bounded and remains an estimate", () => {
  const req = new Request("https://example.com", { headers: { "x-forwarded-for": "203.0.113.25", "user-agent": ua } });
  assert.equal(requestEnvironment(req, {}).ip, null);
  const env = requestEnvironment(req, { VERCEL: "1" });
  assert.equal(env.ip, "203.0.113.25"); assert.equal(env.device, "mobile"); assert.equal(env.os, "iOS"); assert.match(env.browser || "", /Safari/);
  for (const value of ["garbage", "203.0.113.25:443"]) {
    assert.equal(requestEnvironment(new Request("https://example.com", { headers: { "x-forwarded-for": value } }), { VERCEL: "1" }).ip, null);
  }
  assert.equal(requestEnvironment(new Request("https://example.com", { headers: { "x-forwarded-for": "2001:db8::1" } }), { VERCEL: "1" }).ip, "2001:db8::1");
  assert.equal(requestEnvironment(new Request("https://example.com", { headers: { "user-agent": "x".repeat(2000) } })).userAgent?.length, 1024);
});
test("IP region metadata is edge-only, decoded, bounded and excludes coordinates", () => {
  const headers = { "x-vercel-forwarded-for": "203.0.113.25", "x-forwarded-for": "198.51.100.1", "x-vercel-ip-country": "AG", "x-vercel-ip-country-region": "04", "x-vercel-ip-city": "Saint%20John%27s", "x-vercel-ip-timezone": "America/Antigua", "x-vercel-ip-latitude": "17.12", "x-vercel-ip-longitude": "-61.84" };
  const request = new Request("https://example.com", { headers });
  assert.equal(requestEnvironment(request, {}).ipGeo, null);
  const result = requestEnvironment(request, { VERCEL: "1" });
  assert.equal(result.ip, "203.0.113.25");
  assert.deepEqual(result.ipGeo, { source: "vercel", countryCode: "AG", regionCode: "04", city: "Saint John's", timezone: "America/Antigua" });
  assert.ok(!JSON.stringify(result).includes("17.12"));
  for (const city of ["%bad", "%00city", "x".repeat(161)]) assert.equal(requestEnvironment(new Request("https://example.com", {headers:{...headers,"x-vercel-ip-city":city}}), {VERCEL:"1"}).ipGeo?.city,null);
  const missing = requestEnvironment(new Request("https://example.com", {headers:{"x-forwarded-for":"203.0.113.25"}}),{VERCEL:"1"});
  assert.equal(missing.ipGeo?.city,null);assert.equal(missing.ipGeo?.countryCode,null);
});
test("request metadata does not change the business digest on retry", async () => {
  const digests: string[] = [], args: unknown[][] = [];
  const handler = createSubmissionHandler({ enabled: () => true, origin: () => true, limit: async () => {}, save: async (...values) => {
    const [id, _input, digest] = values; digests.push(digest); args.push(values);
    return { id, reference: "test", submittedAt: "now", previewPath: "/test" };
  } });
  const body = { requestId: randomUUID(), website: "", input: { schemaVersion: 1, country: "AG", name: "Audit test", email: "native-test@example.com", phone: "+12025550101", phoneCountry: "US", address: "123 Test Street", monthlyKwh: 650, profile: "evening", answers: { motivations: [], otherMotivation: "", airConditioning: "", wifi: "", otherAppliances: "" }, privacyAccepted: true, privacyVersion: PRIVACY_VERSION } };
  for (const location of [{ status: "denied" }, { status: "timed_out" }, { status: "captured", latitude: 999 }]) {
    const response = await handler(new Request("https://example.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, location }) }));
    assert.equal(response.status, 200);
  }
  assert.equal(new Set(digests).size, 1);
  assert.ok(args.every(values => values.length === 3));
  assert.equal(submissionSchema.parse({...body,location:{status:"captured",latitude:17}}).location, undefined);
});
