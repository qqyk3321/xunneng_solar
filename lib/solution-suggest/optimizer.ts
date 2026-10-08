import { modelId, type GenerationModel, type Installation } from "./models";
import { BATTERY_EFFICIENCY, DAYS, generationSeries, simulateYear, type EnergyMonth } from "./simulation";

export const INVERTERS = [5, 8, 10] as const;
export const BATTERIES = [5, 10, 15, 20] as const;
export const PANEL_W = 500;
export const RESERVE_SOC_PERCENT = 10;
export const OVERSIZE_RANGE = { min: 0.6, max: 1.2 } as const;
export const FIXED_INSTALLATION: Installation = { source: "pvwatts", region: "antigua", orientation: "south", tilt: 20, mounting: "roof" };
export const OPTIMIZATION_TARGETS = { nightMinimum: 0.5, nightPreferred: 0.8, chargeSocPercent: 95, maximumExport: 0.3 } as const;
export const HIGH_LOAD_POLICY = { transitionStart: 700, fullPreferenceFrom: 750, largerInverterFrom: 1200, nightTarget: 0.8, initialCoverageTarget: 0.75, coverageTarget: 0.9 } as const;
export type CapacityPreference = { active: boolean; nightTarget: number; coverageTarget: number; inverterTargetKw: number };
export function capacityPreference(monthlyKwh: number): CapacityPreference {
  const progress = Math.max(0, Math.min(1, (monthlyKwh - HIGH_LOAD_POLICY.transitionStart) / (HIGH_LOAD_POLICY.fullPreferenceFrom - HIGH_LOAD_POLICY.transitionStart)));
  return {
    active: progress > 0,
    nightTarget: OPTIMIZATION_TARGETS.nightMinimum + (HIGH_LOAD_POLICY.nightTarget - OPTIMIZATION_TARGETS.nightMinimum) * progress,
    coverageTarget: progress > 0 ? HIGH_LOAD_POLICY.initialCoverageTarget + (HIGH_LOAD_POLICY.coverageTarget - HIGH_LOAD_POLICY.initialCoverageTarget) * progress : 0,
    inverterTargetKw: monthlyKwh >= HIGH_LOAD_POLICY.largerInverterFrom ? 10 : monthlyKwh >= HIGH_LOAD_POLICY.fullPreferenceFrom ? 8 : 5,
  };
}
export const PROFILES = {
  daytime: { name: "白天用电", values: [1.9,1.7,1.6,1.5,1.5,2,2.6,3.6,5.1,6.4,7.4,7.9,7.9,7.9,7.6,7.1,6.6,4.9,3.9,3.1,2.6,2.1,1.7,1.4] },
  rush: { name: "白天高峰", values: [2,1.4,1.3,1.2,1.3,1.5,3.5,6.2,7.7,7.2,5.2,4.4,4,3.8,3.8,3.8,3.8,7.3,7.8,7.8,6,4,3,2] },
  evening: { name: "傍晚高峰", values: [1.56,1.45,1.45,1.34,1.34,2,2.78,4.23,4.45,4.45,4.45,4.79,4.23,3.9,3.67,3.34,3.34,5.57,7.57,7.8,8.23,8.41,7.96,1.69] },
  night: { name: "夜间高峰", values: [5.28,5.19,4.41,4.3,3.76,3.76,3.49,3.49,2.8,2.8,2.7,2.7,2.8,3.1,3.1,3.4,3.8,4,5.2,5.3,5.6,5.6,5.3,8.12] },
};
export type ProfileKey = keyof typeof PROFILES;
export type Configuration = { inverterKw: number; batteryKwh: number; panelCount: number; capacityKwp: number; oversize: number };
export type Candidate = Configuration & {
  months: EnergyMonth[]; coverage: number; worstMonthCoverage: number; worstNightCoverage: number;
  nightBatteryShare: number; worstNightBatteryShare: number;
  exportShare: number; exportMatched: boolean;
  minChargeSocPercent: number; meetsTargets: boolean; chargeMatched: boolean;
};
export type Limitation = "generation" | "battery" | "power";
export type Recommendation = Candidate & { candidateCount: number; limitations: Limitation[]; capacityPreference: CapacityPreference };

function baseConfigurations(): Configuration[] {
  return INVERTERS.flatMap(inverterKw => {
    const first = Math.ceil(inverterKw * OVERSIZE_RANGE.min / (PANEL_W / 1000));
    const last = Math.floor(inverterKw * OVERSIZE_RANGE.max / (PANEL_W / 1000));
    return Array.from({ length: last - first + 1 }, (_, i) => first + i).flatMap(panelCount => BATTERIES.map(batteryKwh => ({
      inverterKw, batteryKwh, panelCount, capacityKwp: panelCount * PANEL_W / 1000, oversize: panelCount * PANEL_W / 1000 / inverterKw,
    })));
  });
}

/** Round arrays above 12 upward, then find a permitted inverter without exceeding DC/AC bounds. */
export function alignPanelConfiguration(inverterKw: number, panelCount: number): Omit<Configuration, "batteryKwh"> | null {
  if (!INVERTERS.some(value => value === inverterKw) || !Number.isInteger(panelCount) || panelCount < 1) return null;
  const alignedCount = panelCount > 12 ? Math.ceil(panelCount / 2) * 2 : panelCount;
  const capacityKwp = alignedCount * PANEL_W / 1000;
  for (const rating of INVERTERS) {
    if (rating < inverterKw) continue;
    const oversize = capacityKwp / rating;
    if (oversize >= OVERSIZE_RANGE.min && oversize <= OVERSIZE_RANGE.max) return { inverterKw: rating, panelCount: alignedCount, capacityKwp, oversize };
  }
  return null;
}

export function legalConfigurations(): Configuration[] {
  const unique = new Map<string, Configuration>();
  for (const configuration of baseConfigurations()) {
    const aligned = alignPanelConfiguration(configuration.inverterKw, configuration.panelCount);
    if (!aligned) continue;
    const value = { ...aligned, batteryKwh: configuration.batteryKwh };
    unique.set(`${value.inverterKw}/${value.batteryKwh}/${value.panelCount}`, value);
  }
  return [...unique.values()];
}

const coverage = (demand: number, grid: number) => demand > 0 ? Math.max(0, Math.min(1, 1 - grid / demand)) : 1;
const suppliedShare = (demand: number, supplied: number) => demand > 0 ? Math.max(0, Math.min(1, supplied / demand)) : 1;
export function evaluateConfiguration(model: GenerationModel, monthlyKwh: number, profile: number[], configuration: Configuration): Candidate {
  const months = simulateYear(generationSeries(model, configuration.capacityKwp, configuration.inverterKw), monthlyKwh * 12 / 365, profile, configuration.batteryKwh, RESERVE_SOC_PERCENT, {
    inverterKw: configuration.inverterKw, dailyKwhByMonth: DAYS.map(days => monthlyKwh / days),
  });
  const annual = coverage(months.reduce((sum, m) => sum + m.consumption, 0), months.reduce((sum, m) => sum + m.grid, 0));
  const worstMonth = Math.min(...months.map(m => coverage(m.consumption, m.grid)));
  const worstNight = Math.min(...months.map(m => coverage(m.nightConsumption, m.nightGrid)));
  const nightBatteryShare = suppliedShare(months.reduce((sum, m) => sum + m.nightConsumption, 0), months.reduce((sum, m) => sum + m.nightBattery, 0));
  const worstNightBatteryShare = Math.min(...months.map(m => suppliedShare(m.nightConsumption, m.nightBattery)));
  const minChargeSocPercent = Math.min(...months.map(m => m.minChargeSocPercent ?? 0));
  const generation = months.reduce((sum, m) => sum + m.generation, 0);
  const exportShare = generation > 0 ? Math.max(0, Math.min(1, months.reduce((sum, m) => sum + m.export, 0) / generation)) : 0;
  const epsilon = 1e-9;
  return { ...configuration, months, coverage: annual, worstMonthCoverage: worstMonth, worstNightCoverage: worstNight, nightBatteryShare, worstNightBatteryShare, exportShare, exportMatched: exportShare < OPTIMIZATION_TARGETS.maximumExport, minChargeSocPercent,
    meetsTargets: worstNightBatteryShare + epsilon >= OPTIMIZATION_TARGETS.nightMinimum,
    chargeMatched: minChargeSocPercent + epsilon >= OPTIMIZATION_TARGETS.chargeSocPercent,
  };
}

/** Preserve compact low-demand choices; add useful capacity preference for larger demand. */
export function compareCandidates(a: Candidate, b: Candidate, monthlyKwh = 0): number {
  if (a.meetsTargets !== b.meetsTargets) return a.meetsTargets ? -1 : 1;
  const preference = capacityPreference(monthlyKwh);
  if (a.meetsTargets && preference.active) {
    // A larger unchargeable battery or surplus-heavy array is not useful headroom.
    if (a.chargeMatched !== b.chargeMatched) return a.chargeMatched ? -1 : 1;
    if (a.exportMatched !== b.exportMatched) return a.exportMatched ? -1 : 1;
    if (!a.exportMatched && Math.abs(a.exportShare - b.exportShare) > 1e-9) return a.exportShare - b.exportShare;
    const inverterGapA = Math.max(0, preference.inverterTargetKw - a.inverterKw);
    const inverterGapB = Math.max(0, preference.inverterTargetKw - b.inverterKw);
    if (inverterGapA !== inverterGapB) return inverterGapA - inverterGapB;
    for (const [key, target] of [["worstNightBatteryShare", preference.nightTarget], ["coverage", preference.coverageTarget]] as const) {
      const gapA = Math.max(0, target - a[key]), gapB = Math.max(0, target - b[key]);
      if (Math.abs(gapA - gapB) > 1e-9) return gapA - gapB;
    }
    return a.batteryKwh - b.batteryKwh || a.inverterKw - b.inverterKw || a.panelCount - b.panelCount;
  }
  if (a.meetsTargets) {
    if (a.batteryKwh !== b.batteryKwh) return a.batteryKwh - b.batteryKwh;
    if (a.chargeMatched !== b.chargeMatched) return a.chargeMatched ? -1 : 1;
    if (a.inverterKw !== b.inverterKw) return a.inverterKw - b.inverterKw;
    if (a.exportMatched !== b.exportMatched) return a.exportMatched ? -1 : 1;
    if (!a.exportMatched && Math.abs(a.exportShare - b.exportShare) > 1e-9) return a.exportShare - b.exportShare;
    // No additional sizing reward for exceeding the preferred battery contribution.
    const preferredA = Math.min(a.nightBatteryShare, OPTIMIZATION_TARGETS.nightPreferred);
    const preferredB = Math.min(b.nightBatteryShare, OPTIMIZATION_TARGETS.nightPreferred);
    if (Math.abs(preferredA - preferredB) > 1e-9) return preferredB - preferredA;
    if (Math.abs(a.coverage - b.coverage) > 1e-9) return b.coverage - a.coverage;
  } else {
    for (const key of ["worstNightBatteryShare", "nightBatteryShare", "coverage", "worstMonthCoverage"] as const) {
      if (Math.abs(a[key] - b[key]) > 1e-9) return b[key] - a[key];
    }
  }
  if (a.exportMatched !== b.exportMatched) return a.exportMatched ? -1 : 1;
  if (!a.exportMatched && Math.abs(a.exportShare - b.exportShare) > 1e-9) return a.exportShare - b.exportShare;
  if (a.chargeMatched !== b.chargeMatched) return a.chargeMatched ? -1 : 1;
  return a.batteryKwh - b.batteryKwh || a.inverterKw - b.inverterKw || a.panelCount - b.panelCount;
}

export function optimizeSystem(model: GenerationModel, monthlyKwh: number, profile: number[]): Recommendation {
  if (model.id !== modelId(FIXED_INSTALLATION) || model.source !== FIXED_INSTALLATION.source) throw new Error("推荐必须使用安提瓜、PVWatts、南向 20° 屋顶模型");
  if (!Number.isFinite(monthlyKwh) || monthlyKwh < 0) throw new Error("月用电量无效");
  const configurations = baseConfigurations();
  let best: Candidate | null = null;
  for (const configuration of configurations) {
    const candidate = evaluateConfiguration(model, monthlyKwh, profile, configuration);
    if (!best || compareCandidates(candidate, best, monthlyKwh) < 0) best = candidate;
  }
  if (!best) throw new Error("没有符合限制的设备组合");
  const aligned = alignPanelConfiguration(best.inverterKw, best.panelCount);
  if (!aligned) throw new Error("偶数组件数量超出允许的逆变器或超配比范围");
  if (aligned.inverterKw !== best.inverterKw || aligned.panelCount !== best.panelCount) {
    // Recompute all energy flows and objectives; this is never a display-only rounding.
    best = evaluateConfiguration(model, monthlyKwh, profile, { ...aligned, batteryKwh: best.batteryKwh });
  }
  const limitations: Limitation[] = [];
  if (!best.meetsTargets) {
    if (best.months.some(m => m.powerLimitedGrid > 1e-6)) limitations.push("power");
    const usableOutput = best.batteryKwh * (1 - RESERVE_SOC_PERCENT / 100) * BATTERY_EFFICIENCY;
    if (best.months.some(m => m.nightGrid > 1e-6 && m.nightDeficit / m.days > usableOutput + 1e-6)) limitations.push("battery");
    if (!best.chargeMatched || best.months.some(m => m.generation + 1e-6 < m.consumption)) limitations.push("generation");
    if (!limitations.length) limitations.push("generation");
  }
  return { ...best, candidateCount: legalConfigurations().length, limitations, capacityPreference: capacityPreference(monthlyKwh) };
}
