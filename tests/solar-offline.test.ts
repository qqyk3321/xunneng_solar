import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto, createHash } from "node:crypto";
import vm from "node:vm";

const script = readFileSync("public/solar-analysis/sw.js", "utf8");
const origin = "https://solar.example";
const asset = "/_next/static/chunks/webpack-012abc.js";
const bytes = Buffer.from("window.offlineTest = true;");
const digest = createHash("sha256").update(bytes).digest("hex");

function harness() {
  const listeners: Record<string, (e: any) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const requests: string[] = [];
  const controls = { authorized: true, locked: false, fail: false, broken: false, version: "a".repeat(20), outside: false, malformed: false, suffix: "", shellAsset: "", onAsset: undefined as undefined | (() => void) };
  const key = (url: any) => new URL(typeof url === "string" ? url : url.url, origin).href;
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(name: string) { return stores.delete(name); },
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return { async match(url: any) { return store.get(key(url))?.clone(); }, async put(url: any, response: Response) { store.set(key(url), response.clone()); } };
    },
  };
  const fetch = async (url: any) => {
    const path = new URL(key(url)).pathname;
    requests.push(path);
    if (controls.fail) throw new TypeError("offline");
    if (path.endsWith("offline-permission")) return Response.json(controls.authorized ? { authorized: true } : { error: "denied" }, { status: controls.authorized ? 200 : 401 });
    if (path.endsWith("offline-assets.json")) return Response.json({ schema: 1, version: controls.version, assets: [{ url: controls.malformed ? "/api/private" : asset, bytes: bytes.length, sha256: digest }] });
    if (path === asset) { controls.onAsset?.(); return new Response((controls.broken ? "wrong" : bytes.toString()) + controls.suffix); }
    if (path === "/solar-analysis") return new Response(controls.locked ? '<input id="solar-password" />' : '<main data-solar-authorized="true">Analysis</main>' + (controls.shellAsset ? `<script src="${controls.shellAsset}"></script>` : ""));
    return new Response("network only");
  };
  const self = {
    location: { origin },
    addEventListener(name: string, fn: (e: any) => void) { listeners[name] = fn; },
    skipWaiting() {},
    clients: { async claim() {}, async get() { return { url: origin + (controls.outside ? "/antigua" : "/solar-analysis") }; } },
  };
  vm.runInNewContext(script, { self, caches, fetch, Response, URL, AbortSignal, AbortController, TextDecoder, crypto: webcrypto, console, Date });
  const message = async (type: string, path = "/solar-analysis") => {
    const replies: any[] = []; let work: Promise<void> | undefined;
    listeners.message({ source: { url: origin + path }, data: { type }, ports: [{ postMessage(value: any) { replies.push(value); } }], waitUntil(p: Promise<void>) { work = p; } });
    await work;
    return replies.at(-1);
  };
  const request = async (path: string, mode = "navigate", method = "GET") => {
    let response: Promise<Response> | undefined;
    listeners.fetch({ clientId: "test-client", request: { url: origin + path, mode, method }, respondWith(p: Promise<Response>) { response = p; } });
    return response ? response : null;
  };
  return { stores, requests, controls, message, request, caches };
}

test("offline pack requires authorization and an authorized HTML shell", async () => {
  const h = harness(); h.controls.authorized = false;
  assert.equal((await h.message("PREPARE")).error, "denied");
  assert.equal((await h.message("STATUS")).ready, false);
  h.controls.authorized = true; h.controls.locked = true;
  assert.match((await h.message("PREPARE")).error, /验证已失效/);
  assert.equal((await h.message("STATUS")).ready, false);
});

test("offline pack validates every asset, commits atomically, survives failed updates", async () => {
  const h = harness();
  assert.equal((await h.message("PREPARE")).ready, true);
  const before = await h.message("STATUS");
  h.controls.version = "b".repeat(20); h.controls.broken = true;
  assert.match((await h.message("PREPARE")).error, /版本不一致/);
  assert.equal((await h.message("STATUS")).version, before.version);
  assert.equal([...h.stores.keys()].filter(n => n.includes("data-")).length, 1);
  h.controls.fail = true;
  assert.match(await (await h.request("/solar-analysis"))!.text(), /Analysis/);
  assert.equal(await (await h.request(asset, "cors"))!.text(), bytes.toString());
  assert.equal(await (await h.request(asset + "?dpl=deployment-id", "cors"))!.text(), bytes.toString());
});

test("only exact solar navigations and explicit assets are intercepted", async () => {
  const h = harness(); await h.message("PREPARE");
  for (const path of ["/", "/antigua", "/faq", "/solar-analysis-extra", "/solar-analysis/visit", "/api/private"]) assert.equal(await h.request(path), null);
  assert.equal(await h.request("/solar-analysis?_rsc=foo", "cors"), null);
  assert.equal(await h.request("/solar-analysis", "navigate", "POST"), null);
  assert.equal(await h.message("CLEAR", "/antigua"), undefined);
  h.controls.outside = true; h.controls.fail = true;
  await assert.rejects(h.request(asset, "cors"), /offline/);
});

test("lock screen online revokes offline access, never replaced with cached content", async () => {
  const h = harness(); await h.message("PREPARE"); h.controls.locked = true;
  assert.match(await (await h.request("/solar-analysis"))!.text(), /solar-password/);
  h.controls.fail = true;
  assert.equal((await h.request("/solar-analysis"))!.status, 503);
});

test("eviction is detected; clear preserves unrelated caches", async () => {
  const h = harness(); await h.caches.open("unrelated"); await h.message("PREPARE");
  const name = [...h.stores.keys()].find(n => n.includes("data-"))!;
  h.stores.get(name)!.delete(origin + asset);
  assert.equal((await h.message("STATUS")).ready, false);
  h.controls.fail = true; assert.equal((await h.request("/solar-analysis"))!.status, 503);
  await h.message("CLEAR"); assert.deepEqual([...h.stores.keys()], ["unrelated"]);
});

test("invalid asset manifests cannot cache API or unrelated content", async () => {
  const h = harness(); h.controls.malformed = true;
  assert.match((await h.message("PREPARE")).error, /清单无效/);
  assert.equal(h.requests.includes("/api/private"), false);
});

test("storage failure cannot break online navigation or asset downloads", async () => {
  const h = harness();
  h.caches.open = async () => { throw new Error("storage unavailable"); };
  assert.match(await (await h.request("/solar-analysis"))!.text(), /Analysis/);
  h.controls.locked = true;
  assert.match(await (await h.request("/solar-analysis"))!.text(), /solar-password/);
  assert.equal(await (await h.request(asset, "cors"))!.text(), bytes.toString());
});

test("cancellation preserves the previous complete offline version", async () => {
  const h = harness(); await h.message("PREPARE");
  h.controls.version = "b".repeat(20);
  h.controls.onAsset = () => { void h.message("CANCEL"); };
  assert.match((await h.message("PREPARE")).error, /已取消/);
  const saved = await h.message("STATUS"); assert.equal(saved.ready, true); assert.equal(saved.version, "a".repeat(20));
  assert.equal([...h.stores.keys()].filter(n => n.includes("data-")).length, 1);
});

test("deployment skew between HTML and the resource manifest fails safely", async () => {
  const h = harness(); h.controls.shellAsset = "/_next/static/chunks/new-deployment.js?dpl=new";
  assert.match((await h.message("PREPARE")).error, /页面与离线资源版本不一致/);
  assert.equal((await h.message("STATUS")).ready, false);
  h.controls.shellAsset = asset + "?dpl=current";
  assert.equal((await h.message("PREPARE")).ready, true);
});

test("Vercel toolbar suffix is removed, but original runtime must pass its exact hash", async () => {
  const h = harness();
  h.controls.suffix = '\n;(function(){if(typeof document==="undefined"||!/(?:^|;\\s)__vercel_toolbar=1/.test(document.cookie))return;var s=document.createElement("script");s.src="https://vercel.live/_next-live/feedback/feedback.js";})();\n';
  assert.equal((await h.message("PREPARE")).ready, true);
  h.controls.fail = true;
  assert.equal(await (await h.request(asset, "cors"))!.text(), bytes.toString());
  h.controls.fail = false; h.controls.broken = true;
  assert.match((await h.message("PREPARE")).error, /版本不一致/);
  h.controls.broken = false; h.controls.suffix = '\nwindow.unrecognized = true;';
  assert.match((await h.message("PREPARE")).error, /版本不一致/);
});

test("manifest is solar-scoped and offline preparation is production-only", () => {
  const manifest = JSON.parse(readFileSync("public/solar-analysis/manifest.webmanifest", "utf8"));
  assert.equal(manifest.scope, "/solar-analysis"); assert.equal(manifest.start_url, "/solar-analysis");
  assert.equal(manifest.display, "standalone");
  const route = readFileSync("app/solar-analysis/offline-permission/route.ts", "utf8");
  assert.match(route, /accessCookieIsValid/); assert.match(route, /private, no-store/);
  assert.match(route, /NODE_ENV !== "production"/);
  const builder = readFileSync("scripts/solar/build-offline-assets.mjs", "utf8");
  assert.match(builder, /key.startsWith\('app\/solar-analysis\/'\)/);
  assert.doesNotMatch(builder, /\.env|supabase|api_key/);
});
