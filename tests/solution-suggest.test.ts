import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { accessCookieMode, accessCookieValue, passwordAccessMode, SOLAR_ACCESS_COOKIE } from "../app/solution-suggest/access";
import { accessCookieMode as originalCookieMode, accessCookieValue as originalCookieValue, SOLAR_ACCESS_COOKIE as originalCookieName } from "../app/solar-analysis/access";
import { createSolarVisitReporter } from "../lib/solution-suggest/visit-client";
import { handleSolarVisit, saveSolarVisit, type SolarVisit } from "../lib/solution-suggest/visit-server";
import { MODEL_TABLE_STORAGE_KEY, createModelTableLoader } from "../lib/solution-suggest/model-table-cache";
import { MODEL_TABLE_STORAGE_KEY as originalStorageKey } from "../lib/solar-analysis/model-table-cache";
import type { TableManifest } from "../lib/solution-suggest/model-table";

const id = "d098d8de-4d25-4f2a-9da9-e74c1a6db8ea";
const env = { NODE_ENV: "development" };
const request = () => new Request("http://localhost:3003/solution-suggest/visit", {
  method: "POST", headers: { origin: "http://localhost:3003", "content-type": "application/json" },
  body: JSON.stringify({ id }),
});

test("solution suggest retains both password modes but rejects original module tokens", () => {
  assert.notEqual(SOLAR_ACCESS_COOKIE, originalCookieName);
  assert.equal(passwordAccessMode(process.env.SOLAR_ANALYSIS_PASSWORD || "solortide2026"), "audited");
  assert.equal(passwordAccessMode(process.env.SOLAR_PRIVATE_PASSWORD || "qqyk3321"), "private");
  assert.equal(passwordAccessMode("incorrect"), null);
  for (const mode of ["audited", "private"] as const) {
    assert.equal(accessCookieMode(accessCookieValue(mode)), mode);
    assert.equal(accessCookieMode(originalCookieValue(mode)), null);
    assert.equal(originalCookieMode(accessCookieValue(mode)), null);
  }
});

test("solution visits use their own authorization, path and storage table", async () => {
  const visits: SolarVisit[] = [];
  const options = { env, save: async (visit: SolarVisit) => { visits.push(visit); } };
  assert.equal((await handleSolarVisit(request(), originalCookieValue(), options)).status, 401);
  assert.equal((await handleSolarVisit(request(), accessCookieValue("private"), options)).status, 204);
  assert.equal(visits.length, 0);
  assert.equal((await handleSolarVisit(request(), accessCookieValue(), options)).status, 204);
  assert.equal(visits.length, 1);
  assert.equal(visits[0].page_path, "/solution-suggest");
  let calls = 0;
  await saveSolarVisit(visits[0], { SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "test-only" }, async (url, init) => {
    calls++;
    assert.equal(url, "https://db.example/rest/v1/solution_suggest_access_logs?on_conflict=id");
    assert.deepEqual(JSON.parse(String(init?.body)), visits[0]);
    return new Response(null, { status: 201 });
  });
  assert.equal(calls, 1);
});

test("visit reporter activates only on solution suggest and sends once per entry", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let currentPath = "/solar-analysis";
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { get pathname() { return currentPath; } } } });
  try {
    let calls = 0;
    const reporter = createSolarVisitReporter({ createId: () => id, send: async (url, init) => {
      calls++;
      assert.equal(url, "/solution-suggest/visit");
      assert.equal(init?.credentials, "same-origin");
      return new Response(null, { status: 204 });
    } });
    reporter.record();
    assert.equal(calls, 0);
    currentPath = "/solution-suggest";
    reporter.record();
    reporter.record();
    assert.equal(calls, 1);
    reporter.record(true);
    assert.equal(calls, 2);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("independent model loader validates its own manifest and saves its own cache", async () => {
  assert.notEqual(MODEL_TABLE_STORAGE_KEY, originalStorageKey);
  const manifest: TableManifest = JSON.parse(readFileSync("lib/solution-suggest/model-table-manifest.json", "utf8"));
  const saved = new Map<string, string>();
  let calls = 0;
  const load = createModelTableLoader(manifest, {
    getStorage: () => ({ getItem: key => saved.get(key) ?? null, setItem: (key, value) => { saved.set(key, value); }, removeItem: key => { saved.delete(key); } }),
    fetcher: async url => {
      calls++;
      assert.equal(url, manifest.url);
      return new Response(readFileSync(`public${manifest.url}`, "utf8"));
    },
  });
  const table = await load();
  assert.equal(table.models.length, manifest.modelCount);
  assert.equal(await load(), table);
  assert.equal(calls, 1);
  assert.equal(saved.has(MODEL_TABLE_STORAGE_KEY), true);
  assert.equal(saved.has(originalStorageKey), false);
});
