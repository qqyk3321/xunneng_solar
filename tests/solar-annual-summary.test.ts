import assert from "node:assert/strict";
import test from "node:test";
import { annualSnapshot } from "../lib/solar-analysis/annual-summary";

test("annual snapshot shows baseline but never stale/zero results before a model is ready", () => {
  const s = annualSnapshot(500 / 30 * 365, 7200, null);
  assert.equal(s.baselineKwh, 6083.333333333334);
  assert.equal(s.baselineCost, 7200);
  for (const key of ["grid", "cost", "savedCost", "savedKwh", "generation", "export", "exportPercent", "savingPercent"] as const) assert.equal(s[key], null);
});
test("energy savings and export percentages use distinct correct denominators", () => {
  const s = annualSnapshot(6000, 7000, { grid: 2000, cost: 2100, generation: 8000, export: 3000 });
  assert.equal(s.savedKwh, 4000);
  assert.equal(s.savedCost, 4900);
  assert.equal(s.savingPercent, 70);
  assert.equal(s.exportPercent, 37.5);
});
test("tariff selection changes money without changing energy and zero use stays finite", () => {
  const a = annualSnapshot(6000, 7000, { grid: 2000, cost: 2100, generation: 8000, export: 3000 });
  const b = annualSnapshot(6000, 6500, { grid: 2000, cost: 1900, generation: 8000, export: 3000 });
  assert.equal(a.savedKwh, b.savedKwh); assert.equal(a.exportPercent, b.exportPercent);
  assert.notEqual(a.savedCost, b.savedCost);
  const zero = annualSnapshot(0, 0, { grid: 0, cost: 0, generation: 0, export: 0 });
  assert.equal(zero.savingPercent, 0); assert.equal(zero.exportPercent, 0);
  assert.ok(Object.values(zero).every(Number.isFinite));
});
