import assert from "node:assert/strict";
import test from "node:test";
import {
  ANTIGUA_CONFIG,
  DOMINICA_CONFIG,
} from "../lib/antigua-calculator/config";
import {
  billBounds,
  billFromConsumption,
  calculate,
  consumptionFromBill,
  parseInput,
} from "../lib/antigua-calculator/calculate";

function near(actual: number, expected: number, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
}

test("Dominica reference tariff taxes only base charges above 150 kWh; fuel is VAT-free", () => {
  near(billFromConsumption(50, DOMINICA_CONFIG), 50.69);
  near(billFromConsumption(100, DOMINICA_CONFIG), 105.88);
  near(billFromConsumption(101, DOMINICA_CONFIG), 106.9838);
  near(billFromConsumption(150, DOMINICA_CONFIG), 161.07);
  near(billFromConsumption(151, DOMINICA_CONFIG), 162.2743);
  near(billFromConsumption(500, DOMINICA_CONFIG), 582.575);
  near(billFromConsumption(500), 636);
});

test("Dominica VAT and tier boundaries round-trip and support all package boundaries", () => {
  for (const units of [
    0, 49.99, 50, 50.01, 99.99, 100, 100.01, 149.99, 150, 150.01, 300, 600, 850, 1100, 1400, 1700,
    2000,
  ]) {
    near(
      consumptionFromBill(
        billFromConsumption(units, DOMINICA_CONFIG),
        DOMINICA_CONFIG,
      ),
      units,
    );
  }
  for (const units of [300, 600, 850, 1100, 1400, 1700, 2000]) {
    const result = calculate(
      billFromConsumption(units, DOMINICA_CONFIG),
      "bill",
      DOMINICA_CONFIG,
    );
    assert.equal(result.status, "ready");
  }
});
function ready(
  value: number,
  mode: "bill" | "consumption" = "consumption",
  config = ANTIGUA_CONFIG,
) {
  const result = calculate(value, mode, config);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") throw new Error("Expected ready result");
  return result;
}

const examples = [
  [300, 384.00, 5, 5, 307.200, 3686.400, 76.800, 20000],
  [600, 762.00, 5, 5, 609.600, 7315.200, 152.400, 20000],
  [850, 1077.00, 8, 10, 861.600, 10339.200, 215.400, 30000],
  [1100, 1392.00, 10, 20, 1113.600, 13363.200, 278.400, 40000],
  [1400, 1770.00, 10, 20, 1416.000, 16992.000, 354.000, 40000],
  [1700, 2148.00, 10, 20, 1718.400, 20620.800, 429.600, 40000],
  [2000, 2526.00, 10, 20, 2020.800, 24249.600, 505.200, 40000],
];
for (const [
  kwh,
  bill,
  kw,
  battery,
  monthly,
  annual,
  remaining,
  price,
] of examples) {
  test(`package estimate: ${kwh} kWh, both input modes`, () => {
    for (const result of [ready(kwh), ready(bill, "bill")]) {
      near(result.kwh, kwh);
      near(result.bill, bill);
      near(result.system.inverterKw, kw);
      near(result.system.batteryKwh, battery);
      near(result.monthlySaving, monthly);
      near(result.annualSaving, annual);
      near(result.remainingBill, remaining);
      near(result.years, price / annual);
      near(result.price, price);
    }
  });
}

test("tariff is piecewise invertible and range is derived", () => {
  near(billBounds().min, 384);
  near(billBounds().max, 2526);
  near(billFromConsumption(100), 128);
  near(consumptionFromBill(128), 100);
  for (let cents = 38400; cents <= 252600; cents += 137) {
    const bill = cents / 100;
    near(billFromConsumption(consumptionFromBill(bill)), bill, 0.01);
    near(ready(bill, "bill").bill, bill);
    near(ready(bill, "bill").price, ready(consumptionFromBill(bill)).price);
  }
});

test("all package boundaries use full precision, including cent-denominated bills", () => {
  const packages = ANTIGUA_CONFIG.packages;
  packages.forEach((pkg, index) => {
    for (const q of [pkg.maxKwh - 0.01, pkg.maxKwh]) {
      assert.equal(ready(q).system.name, pkg.name);
      assert.equal(
        ready(billFromConsumption(q), "bill").system.name,
        pkg.name,
      );
    }
    const above = calculate(pkg.maxKwh + 0.01, "consumption");
    if (index === packages.length - 1)
      assert.equal(above.status, "out-of-range");
    else {
      assert.equal(
        ready(pkg.maxKwh + 0.01).system.name,
        packages[index + 1].name,
      );
      assert.equal(
        ready(billFromConsumption(pkg.maxKwh) + 0.01, "bill").system.name,
        packages[index + 1].name,
      );
    }
  });
  assert.equal(calculate(299.99, "consumption").status, "out-of-range");
  assert.equal(ready(300.01).system.inverterKw, 5);
  assert.equal(ready(888, "bill").system.inverterKw, 5);
  assert.equal(ready(888.01, "bill").system.inverterKw, 8);
});

test("all invalid and unsupported values produce no system or financial output", () => {
  for (const value of [null, NaN, Infinity, -Infinity, -10, 0]) {
    for (const mode of ["bill", "consumption"] as const) {
      assert.deepEqual(calculate(value, mode), { status: "invalid" });
    }
  }
  for (const [value, mode] of [
    [383.99, "bill"],
    [2526.01, "bill"],
    [299.99, "consumption"],
    [2000.01, "consumption"],
  ] as const) {
    assert.deepEqual(calculate(value, mode), { status: "out-of-range" });
  }
  for (const text of [
    "",
    " ",
    "-1",
    "0",
    "NaN",
    "Infinity",
    "1e3",
    "1000.001",
    "12hello",
    "1,200",
  ])
    assert.equal(parseInput(text), null);
  assert.equal(parseInput("1200.01"), 1200.01);
  assert.equal(parseInput("714."), 714);
});

test("both regions recommend the three approved home packages at exact boundaries", () => {
  const examples = [
    [300, "Basic", 20000, 4.05],
    [700, "Basic", 20000, 4.05],
    [700.01, "Plus", 30000, 8.1],
    [1000, "Plus", 30000, 8.1],
    [1000.01, "Premium", 40000, 16.2],
    [2000, "Premium", 40000, 16.2],
  ] as const;
  for (const config of [ANTIGUA_CONFIG, DOMINICA_CONFIG]) {
    for (const [kwh, name, price, hours] of examples) {
      for (const result of [ready(kwh, "consumption", config), ready(billFromConsumption(kwh, config), "bill", config)]) {
        assert.equal(result.system.name, name);
        assert.equal(result.price, price);
        near(result.backupHours, hours);
        near(result.years, price / result.annualSaving);
      }
    }
  }
});

test("package budgets are tiered; savings and simple payback remain consistent throughout range", () => {
  let previous = ready(300);
  for (let hundredths = 30001; hundredths <= 200000; hundredths++) {
    const result = ready(hundredths / 100);
    assert.ok(result.price >= previous.price);
    if (result.system.name === previous.system.name) {
      assert.equal(result.price, previous.price);
      assert.ok(result.years < previous.years);
    }
    assert.ok(result.years > 0 && Number.isFinite(result.years));
    near(result.monthlySaving + result.remainingBill, result.bill);
    near(result.monthlySaving * 12, result.annualSaving);
    near(result.annualSaving * result.years, result.price);
    assert.equal(
      result.displaySaving + result.displayRemaining,
      result.displayBill,
    );
    previous = result;
  }
});

test("fuel changes update bills and supported bill range without changing packages at fixed usage", () => {
  const config = {
    ...ANTIGUA_CONFIG,
    tariff: { ...ANTIGUA_CONFIG.tariff, fuelAdjustment: 0.65 },
  };
  near(billBounds(config).min, 315);
  near(billBounds(config).max, 2066);
  for (const [q] of examples) {
    const original = ready(q);
    const changed = ready(q, "consumption", config);
    assert.deepEqual(changed.system, original.system);
    near(changed.price, original.price);
    assert.ok(changed.years > original.years);
    assert.ok(changed.bill < original.bill);
    near(consumptionFromBill(changed.bill, config), q);
    assert.deepEqual(
      ready(changed.bill, "bill", config).system,
      original.system,
    );
  }
});

test("backup depends on battery and assumed load, not inverter size", () => {
  near(ready(300).backupHours, 4.05);
  near(ready(700).backupHours, 4.05);
  for (const q of [700.01, 850, 1000])
    near(ready(q).backupHours, 8.1);
  for (const q of [1000.01, 1400, 1700, 2000])
    near(ready(q).backupHours, 16.2);
});
