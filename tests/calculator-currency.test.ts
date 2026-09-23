import test from "node:test";
import assert from "node:assert/strict";
import {
  CURRENCIES,
  toEc,
  fromEc,
  currencyBounds,
  defaultCurrencyBill,
  type Currency,
} from "../lib/antigua-calculator/currency";
import { calculate } from "../lib/antigua-calculator/calculate";
import {
  ANTIGUA_CONFIG,
  DOMINICA_CONFIG,
} from "../lib/antigua-calculator/config";
test("fixed currencies use EC as their exact calculation anchor", () => {
  assert.equal(toEc(270, "XCD"), 270);
  assert.ok(Math.abs(toEc(100, "USD") - 270) < 1e-9);
  assert.ok(Math.abs(toEc(100, "EUR") - 309.501) < 1e-9);
  assert.ok(Math.abs(toEc(179, "XCG") - 270) < 1e-9);
  for (const currency of Object.keys(CURRENCIES) as Currency[]) {
    assert.ok(Math.abs(toEc(fromEc(1200, currency), currency) - 1200) < 1e-9);
    const actual = calculate(toEc(fromEc(1200, currency), currency), "bill");
    const expected = calculate(1200, "bill");
    assert.equal(actual.status, "ready");
    if (actual.status === "ready" && expected.status === "ready") {
      assert.equal(actual.system.inverterKw, expected.system.inverterKw);
      assert.ok(Math.abs(actual.years - expected.years) < 1e-9);
    }
  }
});
test("integer slider boundaries and reset defaults stay inside each region's model", () => {
  for (const config of [ANTIGUA_CONFIG, DOMINICA_CONFIG])
    for (const currency of Object.keys(CURRENCIES) as Currency[]) {
      const { min, max } = currencyBounds(config, currency);
      for (const amount of [min, max, defaultCurrencyBill(config, currency)])
        assert.equal(
          calculate(toEc(amount, currency), "bill", config).status,
          "ready",
        );
    }
});
