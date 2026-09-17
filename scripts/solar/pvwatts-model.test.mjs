import test from "node:test";
import assert from "node:assert/strict";
import { configurations, DAYS, deriveModel, sanitize } from "./pvwatts-model.mjs";

function fixture() {
  const config = configurations()[0];
  const ac = DAYS.flatMap((days, m) => Array.from({ length: days * 24 }, (_, i) => (m + 1) * 100 + i % 24));
  const ac_monthly = DAYS.map((d, m) => ((m + 1) * 100 + 11.5) * 24 * d / 1000);
  const outputs = { ac, dc: [...ac], ac_monthly, dc_monthly: [...ac_monthly], ac_annual: ac_monthly.reduce((s, v) => s + v, 0) };
  for (const name of ["poa", "dn", "df", "wspd", "alb", "tamb", "tcell"]) outputs[name] = Array(8760).fill(name === "tamb" ? -2 : 0);
  return { config, response: { inputs: config.request, errors: [], warnings: [], version: "8.0.0",
    ssc_info: { module: "pvwattsv8" }, station_info: { tz: -4, distance: 1492, lat: 17.13, lon: -61.86, weather_data_source: "NSRDB test" }, outputs } };
}
const derive = ({ config, response }) => deriveModel(response, config, "2026-09-17T00:00:00Z");

test("36 distinct configurations: 32 tilted roofs and 4 horizontal mounting variants", () => {
  const configs = configurations();
  assert.equal(configs.length, 36);
  assert.equal(new Set(configs.map(c => c.id)).size, 36);
  assert.deepEqual([...new Set(configs.map(c => c.request.tilt))], [10, 15, 20, 30, 0]);
  for (const c of configs) {
    assert.equal(c.request.azimuth, { north: 0, east: 90, south: 180, west: 270, horizontal: 0 }[c.orientation]);
    assert.equal(c.request.system_capacity, 1);
    assert.equal(c.request.dc_ac_ratio, 1.2);
  }
  for (const site of ["antigua", "dominica"]) {
    const flat = configs.filter(c => c.site.id === site && c.request.tilt === 0);
    assert.equal(flat.length, 2);
    assert.deepEqual(flat.map(c => c.request.array_type).sort(), [0, 1]);
  }
});
test("horizontal geometry has no cardinal orientation and preserves mounting type", () => {
  for (const config of configurations().filter(c => c.request.tilt === 0)) {
    const f = fixture(); f.config = config; f.response.inputs = config.request;
    const model = derive(f);
    assert.equal(model.geometry.orientation, "horizontal");
    assert.equal(model.geometry.azimuth_applicable, false);
    assert.equal(model.geometry.azimuth_degrees_clockwise_from_north, null);
    assert.equal(model.request.parameters.azimuth, 0);
    assert.equal(model.system.array_type, config.request.array_type === 0 ? "fixed_open_rack" : "fixed_roof_mounted");
  }
});
test("monthly grouping preserves all 24 local hours, February boundaries and annual totals", () => {
  const model = derive(fixture());
  assert.equal(model.months.length, 12);
  for (const [m, month] of model.months.entries()) {
    assert.equal(month.days, DAYS[m]);
    for (let h = 0; h < 24; h++) assert.ok(Math.abs(month.average_day_hourly_generation_wh[h] - ((m + 1) * 100 + h)) < 1e-9);
  }
  assert.ok(model.validation.annual_ac_difference_kwh < 1e-9);
  assert.equal(model.time_periods[23], "23:00-24:00");
  assert.equal(model.time_basis.utc_offset_hours, -4);
});
test("credentials removed recursively, including secrets reflected in messages", () => {
  const cleaned = sanitize({ inputs: { api_key: "private-key", tilt: 15 }, nested: [{ "X-Api-Key": "private-key", message: "echo private-key" }] }, "private-key");
  assert.deepEqual(cleaned.inputs, { tilt: 15 });
  assert.equal(JSON.stringify(cleaned).includes("private-key"), false);
});
test("rejects incomplete or invalid hourly arrays", () => {
  for (const value of [NaN, Infinity, -1, null, "1"]) {
    const f = fixture(); f.response.outputs.ac[0] = value;
    assert.throws(() => derive(f), /invalid numeric/);
  }
  const f = fixture(); f.response.outputs.ac.pop();
  assert.throws(() => derive(f), /8760/);
});
test("rejects wrong timezone, remote station, mismatched request and model errors", () => {
  const changes = [
    r => { r.station_info.tz = 0; },
    r => { r.station_info.distance = 10001; },
    r => { r.inputs = { ...r.inputs, tilt: 30 }; },
    r => { r.errors = ["upstream error"]; },
    r => { r.ssc_info.module = "other"; },
  ];
  for (const change of changes) { const f = fixture(); change(f.response); assert.throws(() => derive(f)); }
});
test("rejects inconsistent monthly or annual energy instead of silently renormalizing", () => {
  for (const field of ["ac_monthly", "dc_monthly", "ac_annual"]) {
    const f = fixture();
    if (field === "ac_annual") f.response.outputs[field] += 1;
    else f.response.outputs[field][0] += 1;
    assert.throws(() => derive(f), /mismatch/);
  }
});
test("keeps harmless API rounding differences and warnings visible", () => {
  const f = fixture(); f.response.outputs.ac_monthly[0] += 0.00001;
  f.response.warnings.push("Example warning");
  const result = derive(f);
  assert.deepEqual(result.warnings, ["Example warning"]);
  assert.ok(result.validation.max_monthly_ac_difference_kwh > 0);
  assert.notEqual(result.months[0].monthly_energy_kwh, result.months[0].api_monthly_energy_kwh);
});
