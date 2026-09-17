import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { accessCookieValue } from "../app/solar-analysis/access";
import { handleModelRequest, loadGenerationModel } from "../lib/solar-analysis/model-server";
import { DEFAULT_INSTALLATION, modelId } from "../lib/solar-analysis/models";
import { generationSeries, inverterAcKw, simulateYear } from "../lib/solar-analysis/simulation";

const base = "data/solar-generation";
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const catalog = read(`${base}/catalog.json`);
const modelEntries = catalog.batches.flatMap((batch: { path: string; model_count: number }) => {
  const m = read(`${base}/${batch.path}/manifest.json`);
  assert.equal(m.status, "complete"); assert.equal(m.models.length, batch.model_count);
  return m.models.map((entry: { id: string; raw: string; raw_sha256: string }) => ({ ...entry, path: `${base}/${batch.path}/${entry.raw}` }));
});
const near = (a: number, b: number, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("catalog contains all 32 original combinations and 4 horizontal variants with intact hashes", async () => {
  assert.equal(modelEntries.length, 36);
  assert.equal(new Set(modelEntries.map((e: { id: string }) => e.id)).size, 36);
  for (const entry of modelEntries) {
    assert.equal(createHash("sha256").update(readFileSync(entry.path)).digest("hex"), entry.raw_sha256);
    const model = await loadGenerationModel(entry.id);
    assert.equal(model?.dcPowerW?.length, 8760);
    const raw = read(entry.path);
    const ac = generationSeries(model!, 1, 1 / 1.2);
    for (let h = 0; h < 8760; h++) near(ac[h] * 1000, raw.outputs.ac[h], 0.002);
  }
});
test("horizontal uses one orientation-independent model per location and mounting", () => {
  for (const orientation of ["north", "east", "south", "west"] as const) {
    assert.equal(modelId({ ...DEFAULT_INSTALLATION, tilt: 0, orientation }), "antigua/horizontal/tilt-0/roof");
  }
  assert.equal(modelId({ ...DEFAULT_INSTALLATION, tilt: 0, mounting: "open-rack" }), "antigua/horizontal/tilt-0/open-rack");
  assert.throws(() => modelId({ ...DEFAULT_INSTALLATION, mounting: "open-rack" }));
  assert.equal(modelId({ ...DEFAULT_INSTALLATION, source: "hoymiles" }), "hoymiles");
});
test("model endpoint is authorized-only, no-store, allowlisted and does not return credentials/weather payloads", async () => {
  const req = (id: string) => new Request(`https://example.test/solar-analysis/model?id=${encodeURIComponent(id)}`);
  let loads = 0;
  const loader = async () => { loads++; return null; };
  for (const cookie of [undefined, "incorrect"]) assert.equal((await handleModelRequest(req("hoymiles"), cookie, loader)).status, 401);
  assert.equal(loads, 0);
  const cookie = accessCookieValue();
  assert.equal((await handleModelRequest(req("../../.env"), cookie)).status, 404);
  assert.equal((await handleModelRequest(req("antigua/south/tilt-0"), cookie)).status, 404);
  assert.equal((await handleModelRequest(req(""), cookie)).status, 400);
  assert.equal((await handleModelRequest(req("hoymiles"), cookie, async () => { throw new Error("private error"); })).status, 503);
  const response = await handleModelRequest(req("antigua/horizontal/tilt-0/roof"), cookie);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie");
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["dcPowerW", "id", "referenceCapacityKwp", "source", "weatherSource"]);
});
test("inverter follows selected AC rating rather than blindly scaling clipped AC", () => {
  near(inverterAcKw(0, 3.8), 0);
  near(inverterAcKw(15, 3.8), 3.8);
  assert.ok(inverterAcKw(8, 7.6) > inverterAcKw(8, 3.8));
});
test("yearly dispatch conserves energy, respects 0.5C, settles SOC and sums local monthly averages", async () => {
  const model = (await loadGenerationModel("antigua/south/tilt-15"))!;
  const generation = generationSeries(model, 8.82, 7.6);
  const profile = Array.from({ length: 24 }, (_, h) => h >= 18 ? 8 : 3);
  const result = simulateYear(generation, 500 / 30, profile, 10);
  let load = 0, charge = 0, discharge = 0, pv = 0;
  for (const month of result) {
    near(month.consumption, month.days * 500 / 30);
    for (const h of month.hourly) {
      near(h.load, h.pvDirect + h.battery + h.grid);
      near(h.generation, h.pvDirect + h.batteryCharge + h.export);
      assert.ok(h.batteryCharge <= 5 + 1e-9 && h.battery <= 5 + 1e-9);
      assert.ok(h.soc >= 0 && h.soc <= 10 + 1e-9);
      charge += h.batteryCharge * month.days; discharge += h.battery * month.days;
    }
    near(month.generation, month.hourly.reduce((s, h) => s + h.generation * month.days, 0));
    load += month.consumption; pv += month.generation;
  }
  near(load, 365 * 500 / 30);
  near(pv, generation.reduce((a, b) => a + b, 0));
  near(charge * 0.95, discharge / 0.95, 1e-6);
  assert.ok(result[0].hourly[0].soc > 0, "midnight need not be empty");
});
test("no solar, no battery, excess generation and zero load remain finite without artificial savings", () => {
  const profile = Array(24).fill(1);
  const dark = simulateYear(Array(8760).fill(0), 12, profile, 20);
  near(dark.reduce((s, m) => s + m.grid, 0), 365 * 12);
  const noBattery = simulateYear(Array(8760).fill(2), 24, profile, 0);
  near(noBattery.reduce((s, m) => s + m.export, 0), 8760);
  const emptyLoad = simulateYear(Array(8760).fill(2), 0, profile, 10);
  near(emptyLoad.reduce((s, m) => s + m.export, 0), 17520);
  assert.throws(() => simulateYear(Array(8759).fill(0), 1, profile, 0));
});
test("legacy remains available without fabricated installation metadata", async () => {
  const model = (await loadGenerationModel("hoymiles"))!;
  assert.equal(model.source, "hoymiles");
  assert.equal(model.averageDayWh?.length, 12);
  assert.equal(model.dcPowerW, undefined);
  assert.equal(generationSeries(model, 7.84, 8).length, 8760);
});
