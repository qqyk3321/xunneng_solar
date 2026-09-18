import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { accessCookieValue } from "../app/solar-analysis/access";
import { createSolarVisitReporter } from "../lib/solar-analysis/visit-client";
import { handleSolarVisit, saveSolarVisit, solarVisitDetails, type SolarVisit } from "../lib/solar-analysis/visit-server";

const id = "d098d8de-4d25-4f2a-9da9-e74c1a6db8ea";
const env = { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production", SITE_URL: "https://solar.example" };
const request = (body: unknown = { id }, extra: Record<string, string> = {}) => new Request("https://solar.example/solar-analysis/visit", {
  method: "POST",
  headers: { origin: env.SITE_URL, "content-type": "application/json", "user-agent": "Solar visit unit test", "x-forwarded-for": "192.0.2.24", ...extra },
  body: JSON.stringify(body),
});

test("only valid password cookies can create visits; unauthorized attempts never write", async () => {
  const visits: SolarVisit[] = [];
  const options = { env, save: async (visit: SolarVisit) => { visits.push(visit); } };
  for (const cookie of [undefined, "wrong", "", "password"]) {
    const result = await handleSolarVisit(request(), cookie, options);
    assert.equal(result.status, 401);
  }
  assert.equal(visits.length, 0);
  const result = await handleSolarVisit(request(), accessCookieValue(), options);
  assert.equal(result.status, 204);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(visits, [{ id, page_path: "/solar-analysis", ip_address: "192.0.2.24", user_agent: "Solar visit unit test", environment: "production" }]);
  assert.ok(!("accessed_at" in visits[0]), "time comes from the database, not the browser");
});

test("logging rejects cross-origin, malformed, oversized and extra-field payloads without writes", async () => {
  let calls = 0;
  const options = { env, save: async () => { calls++; } };
  for (const headers of [{ origin: "https://evil.example" }, { origin: "" }, { "sec-fetch-site": "cross-site" }]) {
    assert.equal((await handleSolarVisit(request({ id }, headers), accessCookieValue(), options)).status, 403);
  }
  for (const body of [{}, null, [], { id: "bad" }, { id, ip_address: "1.1.1.1" }, { id, accessed_at: "2000-01-01" }, { id: "x".repeat(1024) }]) {
    assert.equal((await handleSolarVisit(request(body), accessCookieValue(), options)).status, 400);
  }
  assert.equal((await handleSolarVisit(request({ id }, { "content-type": "text/plain" }), accessCookieValue(), options)).status, 400);
  assert.equal(calls, 0);
  assert.equal((await handleSolarVisit(new Request("https://solar.example/solar-analysis/visit"), accessCookieValue(), options)).status, 405);
});

test("IP trusts only the Vercel boundary; IPv6 works and missing/local IP stays null", () => {
  assert.equal(solarVisitDetails(id, new Headers({ "x-forwarded-for": "2001:db8::42, 192.0.2.1" }), env).ip_address, "2001:db8::42");
  assert.equal(solarVisitDetails(id, new Headers({ "x-forwarded-for": "bad-ip" }), env).ip_address, null);
  assert.equal(solarVisitDetails(id, new Headers({ "x-forwarded-for": "192.0.2.1" }), {}).ip_address, null);
  const details = solarVisitDetails(id, new Headers({ "user-agent": "a".repeat(2000) }), { VERCEL_ENV: "preview" });
  assert.equal(details.user_agent.length, 1024);
  assert.equal(details.environment, "preview");
});

test("logging failure is swallowed, without retries or a failed-login log", async () => {
  let calls = 0;
  const result = await handleSolarVisit(request(), accessCookieValue(), {
    env,
    save: async () => { calls++; throw new Error("storage unavailable"); },
  });
  assert.equal(result.status, 204);
  assert.equal(calls, 1);
});

test("logging uses the site's production origin fallback and permits local development only locally", async () => {
  let calls = 0;
  const save = async () => { calls++; };
  assert.equal((await handleSolarVisit(request({ id }, { origin: "https://www.solortide.com" }), accessCookieValue(), { env: { NODE_ENV: "production" }, save })).status, 204);
  const local = () => new Request("http://localhost:3003/solar-analysis/visit", {
    method: "POST", headers: { origin: "http://localhost:3003", "content-type": "application/json" }, body: JSON.stringify({ id }),
  });
  assert.equal((await handleSolarVisit(local(), accessCookieValue(), { env: { NODE_ENV: "development" }, save })).status, 204);
  assert.equal((await handleSolarVisit(local(), accessCookieValue(), { env: { NODE_ENV: "production" }, save })).status, 403);
  assert.equal(calls, 2);
});

test("storage makes one insert with duplicate suppression, timeout and no password/cookie", async () => {
  const visit = solarVisitDetails(id, request().headers, env);
  let calls = 0;
  const storageEnv = { SUPABASE_URL: "https://db.example/", SUPABASE_SERVICE_ROLE_KEY: "server-test-key" };
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://db.example/rest/v1/solar_analysis_access_logs?on_conflict=id");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    assert.equal(new Headers(init?.headers).get("prefer"), "resolution=ignore-duplicates,return=minimal");
    assert.deepEqual(JSON.parse(String(init?.body)), visit);
    assert.doesNotMatch(String(init?.body), /password|cookie|server-test-key/);
    return new Response("unavailable", { status: 503 });
  };
  await saveSolarVisit(visit, storageEnv, fetcher);
  assert.equal(calls, 1);
  await saveSolarVisit(visit, {}, fetcher);
  assert.equal(calls, 1, "missing config is a no-op");
  await saveSolarVisit(visit, storageEnv, async () => { calls++; throw new Error("offline"); });
  assert.equal(calls, 2);
});

test("client records once across effect replay/re-render, never retries rejection", async () => {
  const calls: RequestInit[] = [];
  let nextId = 0;
  const reporter = createSolarVisitReporter({
    isActive: () => true,
    createId: () => `internal-${++nextId}`,
    send: async (url, init) => {
      assert.equal(url, "/solar-analysis/visit", "endpoint must be inside the cookie's Path");
      calls.push(init!);
      throw new Error("network unavailable");
    },
  });
  reporter.record();
  reporter.record();
  await Promise.resolve();
  reporter.record();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].credentials, "same-origin");
  assert.equal(calls[0].keepalive, true);
  reporter.record(true);
  reporter.record();
  assert.equal(calls.length, 2, "BFCache restoration is a new visit, not a retry");
  assert.notEqual(calls[0].body, calls[1].body);
});

test("separate entries get fresh reporters; inactive/preloaded pages do not record", () => {
  let calls = 0;
  const options = { createId: () => id, send: (async () => { calls++; return new Response(null, { status: 204 }); }) as typeof fetch };
  createSolarVisitReporter({ ...options, isActive: () => false }).record();
  assert.equal(calls, 0);
  createSolarVisitReporter({ ...options, isActive: () => true }).record();
  createSolarVisitReporter({ ...options, isActive: () => true }).record();
  assert.equal(calls, 2);
  assert.doesNotThrow(() => createSolarVisitReporter({ ...options, isActive: () => true, createId: () => { throw new Error("crypto unavailable"); } }).record());
});

test("tracker is authorized-only and migration grants no browser access", () => {
  const page = readFileSync("app/solar-analysis/page.tsx", "utf8");
  assert.match(page, /if \(mode\) return <>\s*\{mode === "audited" && <SolarVisitTracker \/>\}/);
  assert.doesNotMatch(page, /offline-shell|offlineShell/);
  assert.doesNotMatch(readFileSync("app/solar-analysis/actions.ts", "utf8"), /saveSolarVisit|handleSolarVisit/);
  assert.doesNotMatch(readFileSync("lib/solar-analysis/visit-client.ts", "utf8"), /supabase|SERVICE_ROLE|password/i);
  const migration = readFileSync("supabase/migrations/20260916161424_add_solar_analysis_access_logs.sql", "utf8");
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from public, anon, authenticated, service_role/);
  assert.match(migration, /grant select, insert .* to service_role/);
  assert.doesNotMatch(migration, /create policy|grant.*to (anon|authenticated)/i);
});

test("private password visits are a server-side no-op, even from stale clients", async () => {
  let writes = 0;
  for (const body of [{ id }, { id: "invalid" }]) {
    const response = await handleSolarVisit(request(body), accessCookieValue("private"), {
      env, save: async () => { writes++; },
    });
    assert.equal(response.status, 204);
  }
  assert.equal(writes, 0);
});
