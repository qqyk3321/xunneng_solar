import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import meta from "../lib/solar-analysis/model-table-manifest.json";
import { parseModelTable, tableChecksum, validModelTable, type ModelTable } from "../lib/solar-analysis/model-table";
import { createModelTableLoader, MODEL_TABLE_STORAGE_KEY } from "../lib/solar-analysis/model-table-cache";
import { loadGenerationModel } from "../scripts/solar/archive-reader";
import { DAYS, generationSeries, simulateYear } from "../lib/solar-analysis/simulation";

const manifest = { ...meta, schemaVersion: 1 as const };
const text = readFileSync(`public${manifest.url}`, "utf8");
const table = parseModelTable(text, manifest);
const envelope = (version = manifest.version, content = text) => JSON.stringify({ version, text: content });
const near = (a: number, b: number, eps = 1e-7) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
function storage(initial?: string) {
  const values = new Map(initial === undefined ? [] : [[MODEL_TABLE_STORAGE_KEY, initial]]);
  values.set("unrelated", "preserve");
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
}
const fetchOk = async () => new Response(text);

test("public artifact has a content-hashed URL, 145 compact models, no raw weather or credentials", () => {
  assert.equal(createHash("sha256").update(text).digest("hex"), manifest.version);
  assert.ok(manifest.url.includes(manifest.version.slice(0, 16)));
  assert.equal(table.models.length, 145);
  assert.ok(Buffer.byteLength(text) < 250000);
  assert.doesNotMatch(text, /api_key|authorization|dcPowerW|acPowerW|station_info|request|provenance/i);
  assert.equal(existsSync("app/solar-analysis/model/route.ts"), false);
  assert.ok(table.models.every(m => m.averageDayWh.length === 12 && m.averageDayWh.every(day => day.length === 24)));
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /\/solar-data\/:path\*/); assert.match(config, /max-age=31536000, immutable/);
  assert.doesNotMatch(config, /data\/solar-generation/);
});

test("every monthly point matches the archived local-hour average to 0.01 Wh precision", async () => {
  for (const model of table.models) {
    const original = (await loadGenerationModel(model.id))!;
    assert.equal(model.basis, original.dcPowerW ? "DC" : "AC");
    assert.equal(model.referenceCapacityKwp, original.referenceCapacityKwp);
    let offset = 0;
    const yearly = original.dcPowerW ?? original.acPowerW;
    for (const [month, days] of DAYS.entries()) {
      for (let hour = 0; hour < 24; hour++) {
        const actual = original.averageDayWh?.[month][hour] ?? Array.from({ length: days }, (_, d) => yearly![offset + d * 24 + hour]).reduce((a, b) => a + b, 0) / days;
        near(model.averageDayWh[month][hour], actual, .00500001);
      }
      offset += days * 24;
    }
  }
});

test("averaged generation repeats monthly days and SOC/energy constraints survive the new source", () => {
  for (const source of ["pvwatts", "pvgis-era5", "pvgis-nsrdb", "nasa-power", "hoymiles"]) {
    const model = table.models.find(m => m.source === source)!;
    const generation = generationSeries(model, 4.9, 3.8);
    assert.equal(generation.length, 8760);
    assert.deepEqual(generation.slice(0, 24), generation.slice(24, 48));
    assert.ok(generation.every(n => n >= 0 && n <= 3.8));
    const months = simulateYear(generation, 10, Array(24).fill(1), 5.12, 20);
    near(months.reduce((sum, m) => sum + m.generation, 0), generation.reduce((a, b) => a + b, 0));
    for (const m of months) for (const h of m.hourly) {
      assert.ok(h.soc >= 1.024 - 1e-8 && h.soc <= 5.12 + 1e-8);
      near(h.load, h.pvDirect + h.battery + h.grid);
      near(h.generation, h.pvDirect + h.batteryCharge + h.export);
    }
  }
});

test("validation rejects duplicate/missing IDs, wrong basis, invalid values, metadata and corruption", () => {
  for (const change of [
    (t: ModelTable) => { t.models.pop(); },
    (t: ModelTable) => { t.models[0].id = t.models[1].id; },
    (t: ModelTable) => { t.models[0].basis = t.models[0].basis === "DC" ? "AC" : "DC"; },
    (t: ModelTable) => { t.models[0].averageDayWh[0][0] = -1; },
    (t: ModelTable) => { t.models[0].averageDayWh[0].pop(); },
    (t: ModelTable) => { t.models[0].dcPowerW = [1]; },
  ]) { const bad = structuredClone(table); change(bad); assert.equal(validModelTable(bad), false); }
  assert.throws(() => parseModelTable(text + " ", manifest));
  assert.throws(() => parseModelTable("{}", { ...manifest, checksum: tableChecksum("{}") }));
});

test("first load coalesces requests, persists once, reuses memory and then localStorage across reloads", async t => {
  const disk = storage();
  const fetcher = t.mock.fn(fetchOk);
  const load = createModelTableLoader(manifest, { getStorage: () => disk, fetcher });
  assert.equal(fetcher.mock.callCount(), 0, "constructing the loader must not preload before authorization");
  const [a, b] = await Promise.all([load(), load()]);
  assert.equal(a, b); assert.equal(await load(), a); assert.equal(fetcher.mock.callCount(), 1);
  assert.equal(JSON.parse(disk.getItem(MODEL_TABLE_STORAGE_KEY)!).version, manifest.version);
  const again = createModelTableLoader(manifest, { getStorage: () => disk, fetcher });
  assert.deepEqual(await again(), a); assert.equal(fetcher.mock.callCount(), 1);
  assert.equal(disk.values.get("unrelated"), "preserve");
});

test("outdated or corrupted local cache is replaced without touching other keys", async t => {
  for (const saved of ["{invalid", envelope("old"), envelope(manifest.version, text + " ")]) {
    const disk = storage(saved), fetcher = t.mock.fn(fetchOk);
    const load = createModelTableLoader(manifest, { getStorage: () => disk, fetcher });
    await load(); assert.equal(fetcher.mock.callCount(), 1);
    assert.equal(disk.getItem(MODEL_TABLE_STORAGE_KEY), envelope());
    assert.equal(disk.values.get("unrelated"), "preserve");
  }
});

test("storage getter/read/write failures never prevent in-memory usage", async () => {
  const fail = () => { throw new Error("Storage denied"); };
  for (const getStorage of [fail, () => ({ getItem: fail, setItem: fail, removeItem: fail }), () => ({ getItem: () => null, setItem: fail, removeItem: fail })]) {
    const load = createModelTableLoader(manifest, { getStorage, fetcher: fetchOk });
    assert.equal((await load()).models.length, 145);
    assert.equal(await load(), await load());
  }
});

test("network, invalid JSON and integrity failures retry without poisoning memory or disk", async () => {
  for (const response of [new Response("failure", { status: 503 }), new Response("{broken"), new Response(text + " ")]) {
    let count = 0; const disk = storage(); const policies: unknown[] = [];
    const load = createModelTableLoader(manifest, { getStorage: () => disk, fetcher: async (_url, options) => {
      policies.push(options?.cache); assert.equal(options?.credentials, "omit");
      return count++ === 0 ? response : new Response(text);
    } });
    await assert.rejects(load()); assert.equal(disk.getItem(MODEL_TABLE_STORAGE_KEY), null);
    assert.equal((await load()).models.length, 145); assert.deepEqual(policies, ["force-cache", "reload"]);
  }
});

test("a timed-out load is abortable and the next attempt can succeed", async () => {
  let first = true;
  const load = createModelTableLoader(manifest, { timeoutMs: 5, getStorage: () => storage(), fetcher: async (_url, options) => {
    if (!first) return new Response(text);
    first = false;
    return new Promise((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new Error("abort"))));
  } });
  await assert.rejects(load(), /超时/); assert.equal((await load()).models.length, 145);
});
