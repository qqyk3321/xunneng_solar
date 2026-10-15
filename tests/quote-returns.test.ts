import test from "node:test";
import assert from "node:assert/strict";
import { estimateReturns } from "../lib/quote-pricing/returns";

test("payback uses the quoted XCD amount and monthly tier/VAT bill savings", () => {
  const months = Array.from({ length: 12 }, () => ({ consumption: 300, grid: 50 }));
  const result = estimateReturns(months, 20160);
  assert.ok(Math.abs(result.savedPercent - 250 / 300 * 100) < 1e-9);
  assert.ok(Math.abs(result.antigua.annualBeforeXcd - 4608) < 1e-9);
  assert.ok(Math.abs(result.antigua.annualAfterXcd - 768) < 1e-9);
  assert.ok(Math.abs(result.dominica.annualBeforeXcd - 4100.58) < 1e-9);
  assert.ok(Math.abs(result.dominica.annualAfterXcd - 608.28) < 1e-9);
  assert.ok(Math.abs(result.antigua.annualSavingsXcd - 3840) < 1e-9);
  assert.ok(Math.abs(result.dominica.annualSavingsXcd - 3492.3) < 1e-9);
  assert.ok(Math.abs(result.antigua.years! - 5.25) < 1e-9);
  assert.ok(Math.abs(result.dominica.years! - 20160 / 3492.3) < 1e-9);
  assert.equal(estimateReturns(months, 40320).antigua.years, result.antigua.years! * 2);
});

test("minimum bills, zero demand, absent quote and no savings do not invent payback", () => {
  assert.equal(estimateReturns([{ consumption: 10, grid: 0 }], 1000).antigua.years, null);
  assert.equal(estimateReturns([{ consumption: 300, grid: 300 }], 1000).dominica.years, null);
  const zero = estimateReturns([{ consumption: 0, grid: 0 }], 1000);
  assert.equal(zero.savedPercent, 0);
  assert.equal(zero.antigua.years, null);
  assert.equal(estimateReturns([{ consumption: 300, grid: 50 }], null).antigua.years, null);
});
