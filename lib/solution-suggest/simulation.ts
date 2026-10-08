import type { GenerationModel } from "./models";

export const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const BATTERY_POWER_PER_KWH = 0.5;
export const BATTERY_EFFICIENCY = 0.95;
export const DEFAULT_RESERVE_SOC_PERCENT = 10;
export const RESERVE_SOC_OPTIONS = [10, 20, 30] as const;
export type HourFlow = { hour: number; load: number; generation: number; pvDirect: number; batteryCharge: number; battery: number; grid: number; export: number; soc: number };
export type EnergyMonth = { month: number; days: number; hourly: HourFlow[]; consumption: number; generation: number; grid: number; export: number; selfUse: number; batteryChargeStored: number; batteryUtilizationPercent: number | null; nightConsumption: number; nightGrid: number; nightBattery: number; nightDeficit: number; minDuskSocPercent: number | null; minChargeSocPercent: number | null; powerLimitedGrid: number };
export type DispatchOptions = { inverterKw?: number; dailyKwhByMonth?: number[] };

export function batteryOperatingWindow(capacity: number, reservePercent = DEFAULT_RESERVE_SOC_PERCENT) {
  if (!Number.isFinite(capacity) || capacity < 0 || !Number.isFinite(reservePercent) || reservePercent < 0 || reservePercent >= 100) throw new Error("电池容量或 SOC 保留比例无效");
  const reserveKwh = capacity * reservePercent / 100;
  return { reserveKwh, usableKwh: capacity - reserveKwh };
}

/** Daily coverage of one usable charge window, not round-trip efficiency or cycle throughput. */
export function dailyBatteryUtilization(storedKwh: number, usableKwh: number): number | null {
  return usableKwh > 0 ? Math.min(100, Math.max(0, storedKwh / usableKwh * 100)) : null;
}

export function annualBatteryUtilization(months: Pick<EnergyMonth, "days" | "batteryUtilizationPercent">[]): number | null {
  if (!months.length || months.some(m => m.batteryUtilizationPercent === null)) return null;
  const days = months.reduce((sum, m) => sum + m.days, 0);
  return days > 0 ? months.reduce((sum, m) => sum + m.batteryUtilizationPercent! * m.days, 0) / days : null;
}

// Simplified Sandia inverter used by the archived SSC 280 PVWatts V8 reference.
// C0..C3 = 0; Pdco = Paco / 0.96; Pso = 0.004931 * Paco in these archived runs.
// Verified against all archived AC series (< 0.002 W difference at reference size).
// Source: NatLabRockies/ssc, ssc/cmod_pvwattsv8.cpp (inverter calculations).
// Generic reference curve, NOT a manufacturer-specific hybrid-inverter model.
export function inverterAcKw(dcKw: number, inverterKw: number) {
  if (inverterKw <= 0 || dcKw <= 0) return 0;
  const startup = 0.004931 * inverterKw;
  return Math.max(0, Math.min(inverterKw, inverterKw * (dcKw - startup) / (inverterKw / 0.96 - startup)));
}

export function generationSeries(model: GenerationModel, capacityKwp: number, inverterKw: number) {
  const scale = capacityKwp / model.referenceCapacityKwp;
  if (model.timeBasis === "monthly-average-day") {
    if (model.averageDayWh?.length !== 12 || model.averageDayWh.some(m => m.length !== 24)) throw new Error("月平均日数据不完整");
    // Convert just 288 reference points, then repeat each monthly day for SOC continuity.
    // Averaging precedes inverter clipping: this is intentionally a simplified estimate.
    const days = model.averageDayWh.map(month => month.map(wh => model.basis === "DC"
      ? inverterAcKw(wh * scale / 1000, inverterKw)
      : Math.max(0, Math.min(inverterKw, wh * scale / 1000))));
    return DAYS.flatMap((count, month) => Array.from({ length: count * 24 }, (_, i) => days[month][i % 24]));
  }
  if (model.source === "pvwatts" || model.source === "nasa-power") {
    if (model.dcPowerW?.length !== 8760) throw new Error("逐时数据不完整");
    return model.dcPowerW.map(w => inverterAcKw(w * scale / 1000, inverterKw));
  }
  if (model.source === "pvgis-era5" || model.source === "pvgis-nsrdb") {
    if (model.acPowerW?.length !== 8760) throw new Error("逐时系统输出不完整");
    // PVGIS P already includes its model/system losses. Do not apply DC->AC twice.
    return model.acPowerW.map(w => Math.max(0, Math.min(inverterKw, w * scale / 1000)));
  }
  if (model.averageDayWh?.length !== 12 || model.averageDayWh.some(m => m.length !== 24)) throw new Error("月平均日数据不完整");
  // Legacy contains AC only: original clipping cannot be undone. Additional AC limit is approximate.
  return DAYS.flatMap((days, month) => Array.from({ length: days * 24 }, (_, i) =>
    Math.max(0, Math.min(inverterKw, model.averageDayWh![month][i % 24] * scale / 1000))));
}

export function simulateYear(generation: number[], dailyKwh: number, profile: number[], batteryKwh: number, reserveSocPercent = DEFAULT_RESERVE_SOC_PERCENT, options: DispatchOptions = {}): EnergyMonth[] {
  if (generation.length !== 8760 || generation.some(v => !Number.isFinite(v) || v < 0)) throw new Error("发电数据无效");
  if (!Number.isFinite(dailyKwh) || dailyKwh < 0 || !Number.isFinite(batteryKwh) || batteryKwh < 0) throw new Error("用电或电池参数无效");
  const profileSum = profile.reduce((a, b) => a + b, 0);
  if (profile.length !== 24 || profile.some(v => !Number.isFinite(v) || v < 0) || profileSum <= 0) throw new Error("用电模型无效");
  const inverterKw = options.inverterKw ?? Infinity;
  if (options.inverterKw !== undefined && (!Number.isFinite(inverterKw) || inverterKw <= 0)) throw new Error("逆变器功率无效");
  const dailyByMonth = options.dailyKwhByMonth ?? DAYS.map(() => dailyKwh);
  if (dailyByMonth.length !== 12 || dailyByMonth.some(v => !Number.isFinite(v) || v < 0)) throw new Error("月度用电参数无效");
  const loads = DAYS.flatMap((days, month) => Array.from({ length: days * 24 }, (_, i) => dailyByMonth[month] * profile[i % 24] / profileSum));
  const { reserveKwh, usableKwh } = batteryOperatingWindow(batteryKwh, reserveSocPercent);
  const maxPower = batteryKwh * BATTERY_POWER_PER_KWH;
  const step = (pv: number, load: number, soc: number) => {
    const pvDirect = Math.min(pv, load, inverterKw), surplus = pv - pvDirect, deficit = load - pvDirect;
    const batteryCharge = Math.max(0, Math.min(surplus, maxPower, (batteryKwh - soc) / BATTERY_EFFICIENCY));
    const dischargePower = Math.min(maxPower, Math.max(0, inverterKw - pvDirect));
    const battery = Math.max(0, Math.min(deficit, dischargePower, (soc - reserveKwh) * BATTERY_EFFICIENCY));
    return { load, generation: pv, pvDirect, batteryCharge, battery,
      grid: deficit - battery, export: surplus - batteryCharge,
      soc: Math.max(reserveKwh, Math.min(batteryKwh, soc + batteryCharge * BATTERY_EFFICIENCY - battery / BATTERY_EFFICIENCY)) };
  };
  const endSoc = (initial: number) => {
    let soc = initial;
    for (let i = 0; i < generation.length; i++) soc = step(generation[i], loads[i], soc).soc;
    return soc;
  };
  // Settle the periodic TMY boundary, so midnight is not forced to an empty battery.
  // Iteration normally converges in 1-2 passes. Bisection covers slow net-charge cases.
  let initial = reserveKwh, settled = batteryKwh === 0;
  for (let pass = 0; pass < 8 && !settled; pass++) {
    const next = endSoc(initial);
    settled = Math.abs(next - initial) < 1e-8;
    initial = next;
  }
  if (!settled) {
    let low = reserveKwh, high = batteryKwh;
    for (let n = 0; n < 40; n++) {
      const mid = (low + high) / 2;
      if (endSoc(mid) > mid) low = mid; else high = mid;
    }
    initial = (low + high) / 2;
  }
  let offset = 0, soc = initial;
  return DAYS.map((days, month) => {
    const hourly: HourFlow[] = Array.from({ length: 24 }, (_, hour) => ({ hour, load: 0, generation: 0, pvDirect: 0, batteryCharge: 0, battery: 0, grid: 0, export: 0, soc: 0 }));
    const result: EnergyMonth = { month: month + 1, days, hourly, consumption: 0, generation: 0, grid: 0, export: 0, selfUse: 0, batteryChargeStored: 0, batteryUtilizationPercent: usableKwh > 0 ? 0 : null, nightConsumption: 0, nightGrid: 0, nightBattery: 0, nightDeficit: 0, minDuskSocPercent: batteryKwh > 0 ? 100 : null, minChargeSocPercent: batteryKwh > 0 ? 100 : null, powerLimitedGrid: 0 };
    let dailyStored = 0, daytimePeak = 0;
    for (let i = 0; i < days * 24; i++) {
      const h = i % 24, flow = step(generation[offset], loads[offset], soc);
      offset++;
      soc = flow.soc;
      for (const key of Object.keys(flow) as (keyof typeof flow)[]) hourly[h][key] += flow[key] / days;
      result.consumption += flow.load;
      result.generation += flow.generation;
      result.grid += flow.grid;
      result.export += flow.export;
      result.selfUse += flow.load - flow.grid;
      result.powerLimitedGrid += Math.max(0, flow.load - flow.pvDirect - Math.min(maxPower, Math.max(0, inverterKw - flow.pvDirect)));
      if (h >= 18 || h < 6) {
        result.nightConsumption += flow.load;
        result.nightGrid += flow.grid;
        result.nightBattery += flow.battery;
        result.nightDeficit += flow.load - flow.pvDirect;
      }
      if (h === 17 && result.minDuskSocPercent !== null) result.minDuskSocPercent = Math.min(result.minDuskSocPercent, soc / batteryKwh * 100);
      if (h >= 6 && h < 18) daytimePeak = Math.max(daytimePeak, soc);
      if (h === 17 && result.minChargeSocPercent !== null) {
        result.minChargeSocPercent = Math.min(result.minChargeSocPercent, daytimePeak / batteryKwh * 100);
        daytimePeak = 0;
      }
      const stored = flow.batteryCharge * BATTERY_EFFICIENCY;
      result.batteryChargeStored += stored;
      dailyStored += stored;
      if (h === 23) {
        if (result.batteryUtilizationPercent !== null) result.batteryUtilizationPercent += dailyBatteryUtilization(dailyStored, usableKwh)! / days;
        dailyStored = 0;
      }
    }
    return result;
  });
}
