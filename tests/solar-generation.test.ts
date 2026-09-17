import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { loadGenerationModel } from "../scripts/solar/archive-reader";
import { DEFAULT_INSTALLATION, SOURCES, installationLabel, modelId, validGenerationModel, type SolarSource } from "../lib/solar-analysis/models";
import { generationSeries, inverterAcKw, simulateYear } from "../lib/solar-analysis/simulation";

const base = "data/solar-generation";
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const catalog = read(`${base}/catalog.json`);
const modelEntries = catalog.batches.filter((b: { path: string }) => b.path.startsWith("pvwatts-v8/")).flatMap((batch: { path: string; model_count: number }) => {
  const m = read(`${base}/${batch.path}/manifest.json`);
  assert.equal(m.status, "complete"); assert.equal(m.models.length, batch.model_count);
  return m.models.map((entry: { id: string; raw: string; raw_sha256: string }) => ({ ...entry, path: `${base}/${batch.path}/${entry.raw}` }));
});
const additionalBatches = catalog.batches.filter((b: { path: string }) => b.path.startsWith("additional-v1/"));
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
test("all additional archives are complete, reproducible, correctly aggregated and loadable", async () => {
  assert.equal(catalog.model_count, 144);
  assert.equal(additionalBatches.length, 3);
  const ids = new Set(modelEntries.map((e: { id: string }) => e.id));
  for (const batch of additionalBatches) {
    const folder = `${base}/${batch.path}`;
    const manifest = read(`${folder}/manifest.json`);
    assert.equal(manifest.status, "complete");
    assert.equal(manifest.models.length, 36);
    assert.equal(manifest.models.length, batch.model_count);
    assert.ok(Object.hasOwn(SOURCES, manifest.source));
    const checkedRaw = new Set<string>();
    for (const entry of manifest.models) {
      assert.equal(ids.has(entry.id), false); ids.add(entry.id);
      for (const [file, hash] of Object.entries({ [entry.runtime]: entry.runtime_sha256, [entry.curve]: entry.curve_sha256, ...entry.raw_sha256 })) {
        assert.equal(createHash("sha256").update(readFileSync(`${folder}/${file}`)).digest("hex"), hash);
      }
      const archived = JSON.parse(gunzipSync(readFileSync(`${folder}/${entry.runtime}`)).toString());
      const curve = read(`${folder}/${entry.curve}`);
      const model = (await loadGenerationModel(entry.id))!;
      assert.equal(validGenerationModel(model), true);
      assert.equal(model.source, manifest.source);
      assert.equal(model.referenceCapacityKwp, 1);
      assert.equal(model.historicalYear, manifest.year);
      assert.equal(archived.localUtcOffsetHours, -4);
      assert.equal(curve.time_basis.kind, "historical_year");
      assert.equal(curve.time_basis.year, manifest.year);
      assert.equal(curve.months.length, 12);
      assert.equal("provenance" in model, false, "archive metadata stays server-side");
      const generation = generationSeries(model, 1, 1 / 1.2);
      const archivedGeneration = model.acPowerW ? model.acPowerW.map(w => w / 1000) : generation;
      let offset = 0;
      for (const month of curve.months) {
        assert.equal(month.average_day_hourly_generation_wh.length, 24);
        const chunk = archivedGeneration.slice(offset, offset + month.days * 24);
        near(chunk.reduce((a, b) => a + b, 0), month.monthly_energy_kwh);
        for (let h = 0; h < 24; h++) near(chunk.filter((_, i) => i % 24 === h).reduce((a, b) => a + b, 0) * 1000 / month.days, month.average_day_hourly_generation_wh[h]);
        offset += month.days * 24;
      }
      near(archivedGeneration.reduce((a, b) => a + b, 0), entry.annual_generation_kwh);
      assert.equal(offset, 8760);
      const geometry = curve.geometry;
      assert.equal(modelId({ source: model.source, region: curve.site.id, tilt: geometry.tilt_degrees_from_horizontal, orientation: geometry.orientation, mounting: geometry.mounting }), entry.id);
      for (const rawPath of Object.keys(entry.raw_sha256)) {
        if (checkedRaw.has(rawPath)) continue;
        checkedRaw.add(rawPath);
        const raw = JSON.parse(gunzipSync(readFileSync(`${folder}/${rawPath}`)).toString());
        const receipt = read(`${folder}/${rawPath.replace(/\.gz$/, ".request.json")}`);
        assert.equal(receipt.raw_sha256, entry.raw_sha256[rawPath]);
        assert.ok(receipt.url.startsWith("https://"));
        assert.equal(new URL(receipt.url).searchParams.has("api_key"), false);
        if (manifest.source.startsWith("pvgis-")) {
          const byTime = new Map(raw.outputs.hourly.map((r: { time: string; P: number }) => [r.time.slice(0, 11), r.P]));
          const first = Date.UTC(manifest.year, 0, 1, 4);
          for (let i = 0; i < 8760; i++) {
            const t = new Date(first + i * 3600000).toISOString();
            const key = t.slice(0, 10).replaceAll("-", "") + ":" + t.slice(11, 13);
            assert.equal(model.acPowerW![i], byTime.get(key), "UTC-4 local hour must match raw P");
          }
          assert.equal(raw.inputs.meteo_data.radiation_db, model.weatherSource);
          assert.equal(raw.meta.outputs.hourly.variables.P.units, "W");
          assert.equal(raw.inputs.location.latitude, curve.site.latitude);
          assert.equal(raw.inputs.location.longitude, curve.site.longitude);
          assert.equal(raw.inputs.pv_module.peak_power, 1);
          assert.equal(raw.inputs.pv_module.system_loss, 14);
          assert.equal(raw.inputs.mounting_system.fixed.slope.value, geometry.tilt_degrees_from_horizontal);
          const angle = raw.inputs.mounting_system.fixed.azimuth.value;
          const expected = { north: -179, east: -90, south: 0, west: 90, horizontal: -179 }[geometry.orientation as string];
          assert.equal(angle, expected);
        } else {
          assert.equal(raw.header.time_standard, "UTC");
          assert.equal(raw.parameters.ALLSKY_SFC_SW_DWN.units, "Wh/m^2");
        }
      }
    }
  }
  assert.equal(ids.size, catalog.model_count);
});
test("new source scaling respects AC output and reports the PVGIS north exception", async () => {
  for (const source of ["pvgis-era5", "pvgis-nsrdb", "nasa-power"] as SolarSource[]) {
    const config = { ...DEFAULT_INSTALLATION, source };
    const model = (await loadGenerationModel(modelId(config)))!;
    const series = generationSeries(model, 7.84, 3.8);
    assert.ok(series.every(v => v >= 0 && v <= 3.8));
    if (source.startsWith("pvgis-")) {
      near(generationSeries(model, 1, 10).reduce((a, b) => a + b, 0), model.acPowerW!.reduce((a, b) => a + b, 0) / 1000);
      assert.match(installationLabel({ ...config, orientation: "north" }), /接口回显 1°/);
      assert.doesNotMatch(installationLabel({ ...config, orientation: "north", tilt: 0 }), /接口回显/);
    }
    const result = simulateYear(series, 500 / 30, Array(24).fill(1), 10);
    for (const m of result) for (const h of m.hourly) {
      near(h.generation, h.pvDirect + h.batteryCharge + h.export);
      near(h.load, h.pvDirect + h.battery + h.grid);
      assert.ok(h.batteryCharge <= 5 + 1e-9 && h.battery <= 5 + 1e-9);
    }
    assert.equal(validGenerationModel({ ...model, acPowerW: [NaN], dcPowerW: [Infinity] }), false);
  }
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
