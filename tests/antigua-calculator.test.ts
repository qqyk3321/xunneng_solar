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

test("Dominica reference tariff taxes only charges above 100 kWh", () => {
  near(billFromConsumption(50, DOMINICA_CONFIG), 45.5);
  near(billFromConsumption(100, DOMINICA_CONFIG), 95.5);
  near(billFromConsumption(101, DOMINICA_CONFIG), 96.65);
  near(billFromConsumption(500, DOMINICA_CONFIG), 555.5);
  near(billFromConsumption(500), 596);
});

test("Dominica VAT and tier boundaries round-trip and support all package boundaries", () => {
  for (const units of [
    0, 49.99, 50, 50.01, 99.99, 100, 100.01, 300, 600, 850, 1100, 1400, 1700,
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
  [300, 360, 3.8, 5, 288, 3456, 72, 4, 13824],
  [600, 714, 3.8, 5, 571.2, 6854.4, 142.8, 4, 27417.6],
  [850, 1009, 4.8, 10, 807.2, 9686.4, 201.8, 3.7, 35839.68],
  [1100, 1304, 6, 10, 1043.2, 12518.4, 260.8, 3.4, 42562.56],
  [1400, 1658, 7.6, 10, 1326.4, 15916.8, 331.6, 3.1, 49342.08],
  [1700, 2012, 9.6, 10, 1609.6, 19315.2, 402.4, 2.9, 56014.08],
  [2000, 2366, 11.5, 10, 1892.8, 22713.6, 473.2, 2.7, 61326.72],
];
for (const [
  kwh,
  bill,
  kw,
  battery,
  monthly,
  annual,
  remaining,
  years,
  price,
] of examples) {
  test(`handoff acceptance example: ${kwh} kWh, both input modes`, () => {
    for (const result of [ready(kwh), ready(bill, "bill")]) {
      near(result.kwh, kwh);
      near(result.bill, bill);
      near(result.system.inverterKw, kw);
      near(result.system.batteryKwh, battery);
      near(result.monthlySaving, monthly);
      near(result.annualSaving, annual);
      near(result.remainingBill, remaining);
      near(result.years, years);
      near(result.price, price);
    }
  });
}

test("tariff is piecewise invertible and range is derived", () => {
  near(billBounds().min, 360);
  near(billBounds().max, 2366);
  near(billFromConsumption(100), 120);
  near(consumptionFromBill(120), 100);
  for (let cents = 36000; cents <= 236600; cents += 137) {
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
      assert.equal(ready(q).system.model, pkg.model);
      assert.equal(
        ready(billFromConsumption(q), "bill").system.model,
        pkg.model,
      );
    }
    const above = calculate(pkg.maxKwh + 0.01, "consumption");
    if (index === packages.length - 1)
      assert.equal(above.status, "out-of-range");
    else {
      assert.equal(
        ready(pkg.maxKwh + 0.01).system.model,
        packages[index + 1].model,
      );
      assert.equal(
        ready(billFromConsumption(pkg.maxKwh) + 0.01, "bill").system.model,
        packages[index + 1].model,
      );
    }
  });
  assert.equal(calculate(299.99, "consumption").status, "out-of-range");
  assert.equal(ready(300.01).system.inverterKw, 3.8);
  assert.equal(ready(714, "bill").system.inverterKw, 3.8);
  assert.equal(ready(714.01, "bill").system.inverterKw, 4.8);
});

test("all invalid and unsupported values produce no system or financial output", () => {
  for (const value of [null, NaN, Infinity, -Infinity, -10, 0]) {
    for (const mode of ["bill", "consumption"] as const) {
      assert.deepEqual(calculate(value, mode), { status: "invalid" });
    }
  }
  for (const [value, mode] of [
    [359.99, "bill"],
    [2366.01, "bill"],
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

test("price is continuous at every transition", () => {
  for (const pkg of ANTIGUA_CONFIG.packages.slice(0, -1)) {
    const below = ready(pkg.maxKwh - 0.000001);
    const above = ready(pkg.maxKwh + 0.000001);
    near(below.price, above.price, 0.001);
    near(below.years, above.years, 0.000001);
  }
});

test("price increases and target payback never increases throughout range", () => {
  let previous = ready(300);
  for (let hundredths = 30001; hundredths <= 200000; hundredths++) {
    const result = ready(hundredths / 100);
    assert.ok(result.price > previous.price);
    assert.ok(result.years <= previous.years + 1e-12);
    assert.ok(result.years >= 2.7 && result.years <= 4);
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
    near(changed.years, original.years);
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
  for (const q of [600.01, 850, 1100, 1400, 1700, 2000])
    near(ready(q).backupHours, 8.1);
});
