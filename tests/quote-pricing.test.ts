import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PRICING, estimateQuoteXcd, parsePricingValues } from "../lib/quote-pricing/model";

test("quotation uses USD equipment cost, 4x markup, EC$500 compensation, then rounds upward", () => {
  assert.equal(estimateQuoteXcd(DEFAULT_PRICING, { inverterKw: 5, batteryKwh: 5, panelCount: 6 }), 22200);
  assert.equal(estimateQuoteXcd(DEFAULT_PRICING, { inverterKw: 8, batteryKwh: 20, panelCount: 14 }), 53500);
  assert.equal(estimateQuoteXcd(DEFAULT_PRICING, { inverterKw: 8, batteryKwh: 10, panelCount: 14 }), 40500);
});

test("round only the final sum: exact hundreds stay fixed, even fractional cents go upward", () => {
  const equipment = { inverterKw: 5 as const, batteryKwh: 5, panelCount: 6 };
  const prices = { ...DEFAULT_PRICING, inverter_5kw_usd: 37, battery_5kwh_usd: 0, panel_usd: 0, price_multiplier: 1, compensation_xcd: 0 };
  assert.equal(estimateQuoteXcd(prices, equipment), 100);
  assert.equal(estimateQuoteXcd({ ...prices, compensation_xcd: .01 }, equipment), 200);
  assert.equal(estimateQuoteXcd({ ...prices, inverter_5kw_usd: 370.01, price_multiplier: .1 }, equipment), 200);
  assert.equal(estimateQuoteXcd({ ...prices, inverter_5kw_usd: 36.99 }, equipment), 100);
  assert.equal(estimateQuoteXcd({ ...prices, inverter_5kw_usd: 0 }, equipment), 0);
});

test("validate all settings without implicit empty, exponent, boolean, negative or precision coercion", () => {
  for (const bad of ["", " ", null, false, -1, Infinity, NaN, "1e3", "1,000", .001, 1000001]) {
    assert.throws(() => parsePricingValues({ ...DEFAULT_PRICING, panel_usd: bad }));
  }
  for (const bad of [0, 1.01, 100.1]) assert.throws(() => parsePricingValues({ ...DEFAULT_PRICING, price_multiplier: bad }));
  assert.throws(() => parsePricingValues({ ...DEFAULT_PRICING, unknown: 1 }));
  assert.throws(() => parsePricingValues({ panel_usd: 100 }));
  assert.deepEqual(parsePricingValues(Object.fromEntries(Object.entries(DEFAULT_PRICING).map(([key, value]) => [key, String(value)]))), DEFAULT_PRICING);
});
