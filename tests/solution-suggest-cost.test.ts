import assert from "node:assert/strict";
import test from "node:test";
import { calculateEquipmentCost, convertUsd, DEFAULT_COST_PRICES } from "../lib/solution-suggest/cost";

test("cost uses the selected inverter, nominal 5 kWh battery units and actual panel count", () => {
  const small = calculateEquipmentCost({ inverterKw: 5, batteryKwh: 5, panelCount: 6 }, DEFAULT_COST_PRICES, 1);
  assert.equal(small.totalCost, 2000);
  assert.equal(small.salePrice, 2000);
  assert.equal(small.batteryUnits, 1);
  const large = calculateEquipmentCost({ inverterKw: 8, batteryKwh: 20, panelCount: 14 }, DEFAULT_COST_PRICES, 1.5);
  assert.equal(large.inverterCost, 1100, "do not sum prices of all three inverters");
  assert.equal(large.batteryCost, 2400, "charge for nominal capacity, not the 18 kWh SOC window");
  assert.equal(large.panelCost, 1400);
  assert.equal(large.totalCost, 4900);
  assert.equal(large.salePrice, 7350);
  const upgraded = calculateEquipmentCost({ inverterKw: 10, batteryKwh: 20, panelCount: 20 }, DEFAULT_COST_PRICES, 1.2);
  assert.equal(upgraded.totalCost, 5600);
  assert.equal(upgraded.salePrice, 6720);
});

test("user-specified exchange rates divide USD by the local-to-USD rate", () => {
  assert.deepEqual(convertUsd(2000), { usd: 2000, xcd: 5405.41, cny: 13333.33 });
  assert.deepEqual(convertUsd(7350), { usd: 7350, xcd: 19864.86, cny: 49000 });
  assert.equal(convertUsd(37).xcd, 100);
  assert.equal(convertUsd(15).cny, 100);
  assert.deepEqual(convertUsd(0), { usd: 0, xcd: 0, cny: 0 });
  for (const value of [-1, NaN, Infinity, 1e100]) assert.throws(() => convertUsd(value));
});

test("USD cent rounding and one-decimal markup avoid monetary precision drift", () => {
  const r = calculateEquipmentCost({ inverterKw: 5, batteryKwh: 5, panelCount: 6 }, { inverters: { 5: 800.05, 8: 1100, 10: 1200 }, batteryPer5Kwh: 600.10, panelEach: 100.01 }, 1.26);
  assert.equal(r.totalCost, 2000.21);
  assert.equal(r.multiplier, 1.3);
  assert.equal(r.salePrice, 2600.27);
  assert.equal(calculateEquipmentCost({ inverterKw: 5, batteryKwh: 5, panelCount: 6 }, DEFAULT_COST_PRICES, 1.15).multiplier, 1.2);
});

test("zero is valid, while missing, negative and nonfinite costs cannot produce a misleading total", () => {
  const c = { inverterKw: 5, batteryKwh: 5, panelCount: 6 };
  assert.equal(calculateEquipmentCost(c, DEFAULT_COST_PRICES, 0).salePrice, 0);
  assert.equal(calculateEquipmentCost(c, { inverters: { 5: 0, 8: 0, 10: 0 }, batteryPer5Kwh: 0, panelEach: 0 }, 1.5).totalCost, 0);
  for (const value of [-1, NaN, Infinity]) {
    assert.throws(() => calculateEquipmentCost(c, { ...DEFAULT_COST_PRICES, panelEach: value }, 1));
    assert.throws(() => calculateEquipmentCost(c, DEFAULT_COST_PRICES, value));
  }
  assert.throws(() => calculateEquipmentCost({ ...c, inverterKw: 6 }, DEFAULT_COST_PRICES, 1));
  assert.throws(() => calculateEquipmentCost({ ...c, batteryKwh: 7 }, DEFAULT_COST_PRICES, 1));
  assert.throws(() => calculateEquipmentCost(c, { ...DEFAULT_COST_PRICES, panelEach: 1e100 }, 1));
});
