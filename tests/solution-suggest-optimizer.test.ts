import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { modelId, type GenerationModel } from "../lib/solution-suggest/models";
import { BATTERIES, FIXED_INSTALLATION, INVERTERS, OPTIMIZATION_TARGETS, PROFILES, alignPanelConfiguration, capacityPreference, compareCandidates, evaluateConfiguration, legalConfigurations, optimizeSystem, type Candidate } from "../lib/solution-suggest/optimizer";
import { DAYS, simulateYear } from "../lib/solution-suggest/simulation";
import { createSolarReport, type ReportBasis } from "../lib/solution-suggest/report";
import { annualReportOption } from "../app/solution-suggest/report-charts";

const manifest = JSON.parse(readFileSync("lib/solution-suggest/model-table-manifest.json", "utf8"));
const model: GenerationModel = JSON.parse(readFileSync(`public${manifest.url}`, "utf8")).models.find((m: GenerationModel) => m.id === modelId(FIXED_INSTALLATION));
const near = (actual: number, expected: number, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("all 80 final configurations obey ratio bounds and even counts above twelve", () => {
  const configurations = legalConfigurations();
  assert.equal(configurations.length, 80);
  assert.equal(new Set(configurations.map(c => `${c.inverterKw}/${c.batteryKwh}/${c.panelCount}`)).size, 80);
  for (const c of configurations) {
    assert.ok(INVERTERS.some(v => v === c.inverterKw));
    assert.ok(BATTERIES.some(v => v === c.batteryKwh));
    assert.ok(Number.isInteger(c.panelCount));
    assert.ok(c.panelCount <= 12 || c.panelCount % 2 === 0);
    assert.equal(c.capacityKwp, c.panelCount * 0.5);
    assert.equal(c.oversize, c.capacityKwp / c.inverterKw);
    assert.ok(c.oversize >= 0.6 && c.oversize <= 1.2);
  }
  assert.deepEqual([...new Set(configurations.filter(c => c.inverterKw === 8).map(c => c.panelCount))], [10,11,12,14,16,18]);
});

test("panel pairing rounds upward and upgrades inverters without exceeding limits", () => {
  assert.deepEqual(alignPanelConfiguration(8, 13), { inverterKw: 8, panelCount: 14, capacityKwp: 7, oversize: .875 });
  assert.deepEqual(alignPanelConfiguration(8, 19), { inverterKw: 10, panelCount: 20, capacityKwp: 10, oversize: 1 });
  assert.deepEqual(alignPanelConfiguration(5, 13), { inverterKw: 8, panelCount: 14, capacityKwp: 7, oversize: .875 });
  assert.equal(alignPanelConfiguration(5, 11)?.panelCount, 11);
  assert.equal(alignPanelConfiguration(5, 12)?.panelCount, 12);
  assert.equal(alignPanelConfiguration(10, 23)?.panelCount, 24);
  assert.equal(alignPanelConfiguration(10, 25), null, "never invent an inverter above 10 kW");
  assert.equal(alignPanelConfiguration(5, 5), null, "lower ratio limit still applies");
  assert.equal(alignPanelConfiguration(8, 13.5), null);
});

test("dispatch preserves exact monthly demand, combined inverter cap, SOC and energy balances", () => {
  const profile = Array.from({ length: 24 }, (_, h) => h === 12 || h === 20 ? 1 : 0);
  const generation = Array.from({ length: 8760 }, (_, i) => i % 24 >= 8 && i % 24 < 16 ? 3 : 0);
  const months = simulateYear(generation, 900 * 12 / 365, profile, 20, 10, { inverterKw: 5, dailyKwhByMonth: DAYS.map(days => 900 / days) });
  let charged = 0, discharged = 0;
  for (const m of months) {
    near(m.consumption, 900);
    assert.ok(m.powerLimitedGrid > 0);
    for (const h of m.hourly) {
      assert.ok(h.pvDirect + h.battery <= 5 + 1e-9);
      assert.ok(h.battery <= 10 + 1e-9 && h.batteryCharge <= 10 + 1e-9);
      assert.ok(h.soc >= 2 - 1e-9 && h.soc <= 20 + 1e-9);
      near(h.load, h.pvDirect + h.battery + h.grid);
      near(h.generation, h.pvDirect + h.batteryCharge + h.export);
      charged += h.batteryCharge * m.days;
      discharged += h.battery * m.days;
    }
    assert.ok(m.hourly[12].battery > 0, "PV and battery must share inverter headroom");
  }
  near(charged * .95, discharged / .95);
  near(months.reduce((sum, m) => sum + m.consumption, 0), 10800);
});

test("no sunlight cannot produce free battery power or a false charging match", () => {
  const darkModel: GenerationModel = { ...model, averageDayWh: Array.from({ length: 12 }, () => Array(24).fill(0)) };
  const r = optimizeSystem(darkModel, 300, PROFILES.night.values);
  near(r.coverage, 0);
  near(r.minChargeSocPercent, 10);
  assert.equal(r.chargeMatched, false);
  assert.equal(r.meetsTargets, false);
  assert.equal(r.batteryKwh, 5, "a larger unchargeable battery gives no benefit");
  assert.equal(r.inverterKw, 5);
  assert.equal(r.panelCount, 6);
  assert.ok(r.limitations.includes("generation"));
});

test("target and charging priorities cannot reward surplus export or an undersupplied small system", () => {
  const base = evaluateConfiguration(model, 0, PROFILES.night.values, legalConfigurations()[0]);
  const candidate = (changes: Partial<Candidate>): Candidate => ({ ...base, ...changes });
  const matchedSmall = candidate({ batteryKwh: 5, chargeMatched: true });
  const unmatchedSmall = candidate({ batteryKwh: 5, chargeMatched: false });
  const matchedLarge = candidate({ batteryKwh: 10, chargeMatched: true });
  assert.ok(compareCandidates(unmatchedSmall, matchedLarge) < 0, "do not upsize an already qualifying battery just for charging match");
  assert.ok(compareCandidates(matchedSmall, unmatchedSmall) < 0);
  assert.ok(compareCandidates(matchedSmall, matchedLarge) < 0);
  assert.ok(compareCandidates(candidate({ inverterKw: 5, nightBatteryShare: .6 }), candidate({ inverterKw: 10, nightBatteryShare: .8 })) < 0, "80% is a soft preference, not a reason to upsize a qualifying inverter");
  assert.ok(compareCandidates(candidate({ meetsTargets: true, chargeMatched: false }), candidate({ meetsTargets: false, chargeMatched: true, coverage: .979 })) < 0);
  assert.ok(compareCandidates(candidate({ meetsTargets: false, coverage: .8, chargeMatched: false }), candidate({ meetsTargets: false, coverage: .7, chargeMatched: true })) < 0);
  assert.ok(compareCandidates(candidate({ nightBatteryShare: .8 }), candidate({ nightBatteryShare: .6 })) < 0);
  assert.equal(compareCandidates(candidate({ nightBatteryShare: .8 }), candidate({ nightBatteryShare: 1 })), 0, "no sizing bonus above the preferred 80%");
  const lowSurplus = candidate({ exportShare: .25, exportMatched: true, nightBatteryShare: .6 });
  const excessSurplus = candidate({ exportShare: .7, exportMatched: false, nightBatteryShare: .8 });
  assert.ok(compareCandidates(lowSurplus, excessSurplus) < 0, "avoid surplus before pursuing 80% night share");
  assert.ok(compareCandidates(candidate({ exportShare: .4, exportMatched: false }), candidate({ exportShare: .7, exportMatched: false })) < 0);
  assert.equal(compareCandidates(candidate({ exportShare: .1, exportMatched: true }), candidate({ exportShare: .25, exportMatched: true })), 0, "adequate PV should not be penalized further below the target");
  assert.ok(compareCandidates(candidate({ exportShare: .29, exportMatched: true }), candidate({ exportShare: .3, exportMatched: false })) < 0, "target is strictly below 30%");
});

test("surplus-aware tuning removes excess panels while preserving 300 kWh night supply", () => {
  const r = optimizeSystem(model, 300, PROFILES.night.values);
  assert.equal(r.panelCount, 6);
  assert.equal(r.batteryKwh, 5);
  assert.equal(r.inverterKw, 5);
  assert.equal(r.meetsTargets, true);
  assert.equal(r.chargeMatched, true);
  const oversized = evaluateConfiguration(model, 300, PROFILES.night.values, { ...r, panelCount: 12, capacityKwp: 6, oversize: 1.2 });
  assert.ok(r.exportShare < oversized.exportShare);
  assert.ok(compareCandidates(r, oversized) < 0);
  near(r.exportShare, r.months.reduce((sum, m) => sum + m.export, 0) / r.months.reduce((sum, m) => sum + m.generation, 0));
  assert.equal(r.exportMatched, false, "minimum six panels still cannot reach 30%; report the real ratio");
  const higherDemand = optimizeSystem(model, 600, PROFILES.night.values);
  assert.equal(higherDemand.exportMatched, true);
  assert.ok(higherDemand.exportShare < OPTIMIZATION_TARGETS.maximumExport);
});

test("high-load preference ramps near 750 while preserving the accepted small-demand configurations", () => {
  for (const [demand, inverter, battery, panels] of [[300,5,5,6], [600,5,10,9], [700,5,10,10]]) {
    const r = optimizeSystem(model, demand, PROFILES.night.values);
    assert.deepEqual([r.inverterKw, r.batteryKwh, r.panelCount], [inverter, battery, panels]);
    assert.equal(r.capacityPreference.active, false);
  }
  const middle = capacityPreference(725), full = capacityPreference(750);
  assert.equal(middle.active, true);
  assert.ok(middle.nightTarget > .5 && middle.nightTarget < full.nightTarget);
  assert.ok(middle.coverageTarget > .75 && middle.coverageTarget < full.coverageTarget);
  near(full.nightTarget, .8);
  near(full.coverageTarget, .9);
  assert.equal(full.inverterTargetKw, 8);
  assert.equal(capacityPreference(1200).inverterTargetKw, 10);
  assert.deepEqual(capacityPreference(1000000), capacityPreference(1200), "preferences stay capped at available equipment");
});

test("750 kWh now prefers larger useful equipment with charging and surplus control", () => {
  let previous: Candidate | undefined;
  for (const c of legalConfigurations()) {
    const candidate = evaluateConfiguration(model, 750, PROFILES.night.values, c);
    if (!previous || compareCandidates(candidate, previous) < 0) previous = candidate;
  }
  assert.ok(previous);
  const r = optimizeSystem(model, 750, PROFILES.night.values);
  assert.ok(r.inverterKw > previous.inverterKw);
  assert.ok(r.batteryKwh > previous.batteryKwh);
  assert.deepEqual([r.inverterKw, r.batteryKwh], [8,20]);
  assert.equal(r.panelCount, 14);
  assert.equal(r.oversize, .875);
  const simulated = evaluateConfiguration(model, 750, PROFILES.night.values, r);
  near(r.coverage, simulated.coverage);
  near(r.exportShare, simulated.exportShare);
  near(r.months[0].generation, simulated.months[0].generation);
  assert.ok(r.coverage > previous.coverage);
  assert.ok(r.worstNightBatteryShare > previous.worstNightBatteryShare);
  assert.equal(r.chargeMatched, true);
  assert.equal(r.exportMatched, true);
  assert.ok(r.worstNightBatteryShare >= r.capacityPreference.nightTarget);
  assert.ok(r.coverage >= r.capacityPreference.coverageTarget);
  const unchargeable = { ...r, batteryKwh: 20, chargeMatched: false };
  assert.ok(compareCandidates(previous, unchargeable, 750) < 0, "larger batteries must still be chargeable");
});

test("1200 kWh adds inverter headroom without inventing unavailable battery capacity", () => {
  const r = optimizeSystem(model, 1200, PROFILES.night.values);
  assert.equal(r.inverterKw, 10);
  assert.equal(r.batteryKwh, 20);
  assert.equal(r.panelCount, 20);
  assert.equal(r.oversize, 1);
  assert.equal(r.chargeMatched, true);
  assert.equal(r.exportMatched, r.exportShare < .3, "pairing must preserve the real surplus status");
  assert.equal(r.meetsTargets, true);
  assert.ok(r.worstNightBatteryShare < r.capacityPreference.nightTarget, "preferred 80% remains best-effort when 20 kWh is insufficient");
});

test("300 kWh households use 5 kWh across all four profiles, without chasing 98% coverage", () => {
  for (const profile of Object.values(PROFILES)) {
    assert.equal(profile.values.length, 24);
    const recommendation = optimizeSystem(model, 300, profile.values);
    assert.equal(recommendation.batteryKwh, 5, profile.name);
    assert.equal(recommendation.inverterKw, 5, profile.name);
    assert.equal(recommendation.meetsTargets, true, profile.name);
    assert.equal(recommendation.chargeMatched, true, profile.name);
    assert.ok(recommendation.worstNightBatteryShare >= OPTIMIZATION_TARGETS.nightMinimum);
  }
  const r = optimizeSystem(model, 300, PROFILES.night.values);
  assert.equal(r.meetsTargets, true);
  assert.equal(r.chargeMatched, true);
  assert.ok(r.coverage < .98, "annual coverage must not force a larger battery");
  assert.ok(r.worstNightBatteryShare >= OPTIMIZATION_TARGETS.nightMinimum);
  assert.ok(r.minChargeSocPercent >= 95 - 1e-9);
  near(r.months.reduce((sum, m) => sum + m.consumption, 0), 3600);
  const smaller = evaluateConfiguration(model, 300, PROFILES.night.values, { ...r, batteryKwh: r.batteryKwh - 5 });
  assert.equal(smaller.meetsTargets, false, "the selected battery is needed for this night demand");
});

test("excess demand returns a legal fallback with unmet targets and a capacity diagnosis", () => {
  const r = optimizeSystem(model, 3000, PROFILES.night.values);
  assert.equal(r.meetsTargets, false);
  assert.equal(r.inverterKw, 10);
  assert.equal(r.batteryKwh, 20);
  assert.equal(r.panelCount, 24);
  assert.ok(r.limitations.includes("battery"));
  assert.ok(r.coverage < .98);
});

test("zero demand stays finite; invalid demand and unfixed models are rejected", () => {
  const r = optimizeSystem(model, 0, PROFILES.night.values);
  assert.equal(r.coverage, 1);
  assert.equal(r.worstNightCoverage, 1);
  assert.equal(r.batteryKwh, 5);
  assert.equal(r.panelCount, 6);
  for (const value of [-1, NaN, Infinity]) assert.throws(() => optimizeSystem(model, value, PROFILES.night.values));
  assert.throws(() => optimizeSystem({ ...model, id: "antigua/south/tilt-30" }, 300, PROFILES.night.values));
  assert.throws(() => optimizeSystem(model, 300, Array(24).fill(0)));
});

test("night battery metric excludes PV direct supply and equals actual nighttime discharge", () => {
  const r = optimizeSystem(model, 300, PROFILES.night.values);
  const actualBattery = r.months.reduce((sum, m) => sum + m.hourly.filter(h => h.hour >= 18 || h.hour < 6).reduce((total, h) => total + h.battery * m.days, 0), 0);
  const nightDemand = r.months.reduce((sum, m) => sum + m.nightConsumption, 0);
  near(r.nightBatteryShare, actualBattery / nightDemand);
  const artificialSolar: GenerationModel = { ...model, averageDayWh: Array.from({ length: 12 }, () => Array(24).fill(1000)) };
  const directOnly = evaluateConfiguration(artificialSolar, 300, Array(24).fill(1), legalConfigurations()[0]);
  near(directOnly.worstNightCoverage, 1);
  near(directOnly.worstNightBatteryShare, 0);
  assert.equal(directOnly.meetsTargets, false, "PV direct supply cannot count as battery supply");
});

test("report freezes the same optimized equipment and rejects out-of-range configurations", () => {
  const r = optimizeSystem(model, 300, PROFILES.night.values);
  const basis: ReportBasis = { ...r, installation: { ...FIXED_INSTALLATION }, billCountry: "antigua", inputMode: "kwh", inputValue: 300, monthlyInputKwh: 300, panelW: 500, reserveSocPercent: 10, profileKey: "night", profileValues: [...PROFILES.night.values], model,
    optimization: { ...r }, months: r.months.map(m => ({ ...m, antiguaCost: m.grid, dominicaCost: m.grid, antiguaBaseline: m.consumption, dominicaBaseline: m.consumption })) };
  const report = createSolarReport(basis, { name: "Test Customer", address: "Antigua" });
  near(report.totals.consumption, 3600);
  assert.equal(report.panelCount, r.panelCount);
  assert.equal(report.optimization.coverage, r.coverage);
  near(report.optimization.exportShare, report.totals.exportPercent / 100);
  const bars = (annualReportOption(report).series as { type: string; data: number[] }[]).filter(s => s.type === "bar");
  for (let m = 0; m < 12; m++) near(bars.reduce((sum, series) => sum + series.data[m], 0), report.months[m].consumption);
  basis.months[0].grid = 123;
  assert.notEqual(report.months[0].grid, 123);
  assert.throws(() => createSolarReport({ ...basis, panelW: 350 }, { name: "" , address: "" }));
  assert.throws(() => createSolarReport({ ...basis, oversize: 1.21 }, { name: "", address: "" }));
  assert.throws(() => createSolarReport({ ...basis, optimization: { ...basis.optimization, capacityPreference: capacityPreference(750) } }, { name: "", address: "" }), /容量优选目标/);
  assert.throws(() => createSolarReport({ ...basis, inverterKw: 8, panelCount: 13, capacityKwp: 6.5, oversize: .8125 }, { name: "", address: "" }), /配置超出/);
});
