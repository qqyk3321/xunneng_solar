import assert from "node:assert/strict";
import test from "node:test";
import { annualBatteryUtilization, batteryOperatingWindow, dailyBatteryUtilization, simulateYear } from "../lib/solar-analysis/simulation";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const profile = Array.from({ length: 24 }, (_, h) => h >= 18 || h < 6 ? 1 : 0);
const sunny = Array.from({ length: 8760 }, (_, i) => i % 24 >= 10 && i % 24 < 16 ? 4 : 0);

test("10/20/30% reserves are hard SOC floors; 0.5C uses nominal capacity and flows conserve energy", () => {
  const capacity = 5.12;
  near(batteryOperatingWindow(capacity).usableKwh, 4.608);
  let previousGrid = 0;
  for (const reserve of [0, 10, 20, 30]) {
    const result = simulateYear(sunny, 12, profile, capacity, reserve);
    let charge = 0, discharge = 0;
    for (const month of result) {
      near(month.batteryUtilizationPercent!, 100);
      for (const h of month.hourly) {
        assert.ok(h.soc >= capacity * reserve / 100 - 1e-8 && h.soc <= capacity + 1e-8);
        assert.ok(h.batteryCharge <= capacity * .5 + 1e-8 && h.battery <= capacity * .5 + 1e-8);
        near(h.generation, h.pvDirect + h.batteryCharge + h.export);
        near(h.load, h.pvDirect + h.battery + h.grid);
        charge += h.batteryCharge * month.days;
        discharge += h.battery * month.days;
      }
      near(month.batteryChargeStored, month.hourly.reduce((s, h) => s + h.batteryCharge * .95 * month.days, 0));
      near(month.hourly[10].batteryCharge, capacity * .5);
    }
    near(charge * .95, discharge / .95);
    const grid = result.reduce((s, m) => s + m.grid, 0);
    assert.ok(grid >= previousGrid); previousGrid = grid;
    near(annualBatteryUtilization(result)!, 100);
  }
});

test("utilization measures actual net stored charge, not charging potential or SOC", () => {
  const noSolar = simulateYear(Array(8760).fill(0), 12, profile, 5.12);
  assert.equal(annualBatteryUtilization(noSolar), 0);
  near(noSolar[0].hourly[0].soc, .512);
  const idle = simulateYear(sunny, 0, profile, 5.12);
  near(annualBatteryUtilization(idle)!, 0);
  near(idle[0].hourly[0].soc, 5.12);
  const none = simulateYear(sunny, 12, profile, 0);
  assert.equal(annualBatteryUtilization(none), null);
  assert.ok(none.every(m => m.batteryUtilizationPercent === null && m.batteryChargeStored === 0));
});

test("daily percentage is clipped before averaging; annual average is day-weighted", () => {
  near(dailyBatteryUtilization(2.304, 4.608)!, 50);
  near(dailyBatteryUtilization(9.216, 4.608)!, 100);
  assert.equal(dailyBatteryUtilization(0, 0), null);
  // Sunny days support two full cycles; cloudy days none. Average must be ~50%, not 100%.
  const alternating = Array.from({ length: 8760 }, (_, i) => Math.floor(i / 24) % 2 === 0 && [6, 7, 8, 15, 16, 17].includes(i % 24) ? 5 : 0);
  const demand = Array.from({ length: 24 }, (_, h) => [10, 11, 12, 20, 21, 22].includes(h) ? 1 : 0);
  const result = simulateYear(alternating, 20, demand, 5.12);
  near(result[0].batteryUtilizationPercent!, 16 / 31 * 100);
  near(result[1].batteryUtilizationPercent!, 50);
  near(annualBatteryUtilization(result)!, 183 / 365 * 100);
  const simpleAverage = result.reduce((sum, m) => sum + m.batteryUtilizationPercent!, 0) / 12;
  assert.ok(Math.abs(simpleAverage - annualBatteryUtilization(result)!) > .001);
  near(annualBatteryUtilization([{ days: 31, batteryUtilizationPercent: 100 }, { days: 28, batteryUtilizationPercent: 0 }])!, 3100 / 59);
});

test("invalid reserve and capacity are rejected", () => {
  for (const reserve of [-1, 100, NaN, Infinity]) assert.throws(() => simulateYear(sunny, 12, profile, 5.12, reserve));
  for (const capacity of [-1, NaN, Infinity]) assert.throws(() => batteryOperatingWindow(capacity));
  assert.equal(annualBatteryUtilization([]), null);
});
