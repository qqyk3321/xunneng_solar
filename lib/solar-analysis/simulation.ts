import type { GenerationModel } from "./models";

export const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const BATTERY_POWER_PER_KWH = 0.5;
export type HourFlow = { hour: number; load: number; generation: number; pvDirect: number; batteryCharge: number; battery: number; grid: number; export: number; soc: number };
export type EnergyMonth = { month: number; days: number; hourly: HourFlow[]; consumption: number; generation: number; grid: number; export: number; selfUse: number };

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
  if (model.source === "pvwatts") {
    if (model.dcPowerW?.length !== 8760) throw new Error("逐时数据不完整");
    return model.dcPowerW.map(w => inverterAcKw(w * scale / 1000, inverterKw));
  }
  if (model.averageDayWh?.length !== 12 || model.averageDayWh.some(m => m.length !== 24)) throw new Error("月平均日数据不完整");
  // Legacy contains AC only: original clipping cannot be undone. Additional AC limit is approximate.
  return DAYS.flatMap((days, month) => Array.from({ length: days * 24 }, (_, i) =>
    Math.max(0, Math.min(inverterKw, model.averageDayWh![month][i % 24] * scale / 1000))));
}

export function simulateYear(generation: number[], dailyKwh: number, profile: number[], batteryKwh: number): EnergyMonth[] {
  if (generation.length !== 8760 || generation.some(v => !Number.isFinite(v) || v < 0)) throw new Error("发电数据无效");
  if (!Number.isFinite(dailyKwh) || dailyKwh < 0 || !Number.isFinite(batteryKwh) || batteryKwh < 0) throw new Error("用电或电池参数无效");
  const profileSum = profile.reduce((a, b) => a + b, 0);
  if (profile.length !== 24 || profile.some(v => !Number.isFinite(v) || v < 0) || profileSum <= 0) throw new Error("用电模型无效");
  const loads = profile.map(v => dailyKwh * v / profileSum);
  const maxPower = batteryKwh * BATTERY_POWER_PER_KWH;
  const step = (pv: number, load: number, soc: number) => {
    const pvDirect = Math.min(pv, load), surplus = pv - pvDirect, deficit = load - pvDirect;
    const batteryCharge = Math.max(0, Math.min(surplus, maxPower, (batteryKwh - soc) / 0.95));
    const battery = Math.max(0, Math.min(deficit, maxPower, soc * 0.95));
    return { load, generation: pv, pvDirect, batteryCharge, battery,
      grid: deficit - battery, export: surplus - batteryCharge,
      soc: Math.max(0, Math.min(batteryKwh, soc + batteryCharge * 0.95 - battery / 0.95)) };
  };
  const endSoc = (initial: number) => {
    let soc = initial;
    for (let i = 0; i < generation.length; i++) soc = step(generation[i], loads[i % 24], soc).soc;
    return soc;
  };
  // Settle the periodic TMY boundary, so midnight is not forced to an empty battery.
  // Iteration normally converges in 1-2 passes. Bisection covers slow net-charge cases.
  let initial = 0, settled = batteryKwh === 0;
  for (let pass = 0; pass < 8 && !settled; pass++) {
    const next = endSoc(initial);
    settled = Math.abs(next - initial) < 1e-8;
    initial = next;
  }
  if (!settled) {
    let low = 0, high = batteryKwh;
    for (let n = 0; n < 40; n++) {
      const mid = (low + high) / 2;
      if (endSoc(mid) > mid) low = mid; else high = mid;
    }
    initial = (low + high) / 2;
  }
  let offset = 0, soc = initial;
  return DAYS.map((days, month) => {
    const hourly: HourFlow[] = Array.from({ length: 24 }, (_, hour) => ({ hour, load: 0, generation: 0, pvDirect: 0, batteryCharge: 0, battery: 0, grid: 0, export: 0, soc: 0 }));
    const result = { month: month + 1, days, hourly, consumption: 0, generation: 0, grid: 0, export: 0, selfUse: 0 };
    for (let i = 0; i < days * 24; i++) {
      const h = i % 24, flow = step(generation[offset++], loads[h], soc);
      soc = flow.soc;
      for (const key of Object.keys(flow) as (keyof typeof flow)[]) hourly[h][key] += flow[key] / days;
      result.consumption += flow.load;
      result.generation += flow.generation;
      result.grid += flow.grid;
      result.export += flow.export;
      result.selfUse += flow.load - flow.grid;
    }
    return result;
  });
}
