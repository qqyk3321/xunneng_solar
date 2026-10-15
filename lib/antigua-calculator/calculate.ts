import { ANTIGUA_CONFIG } from "./config";

export type InputMode = "bill" | "consumption";
// Only absorbs floating-point noise, never meaningful 0.01 kWh differences.
const EPSILON = 1e-8;

export function billFromConsumption(kwh: number, config = ANTIGUA_CONFIG) {
  const t = config.tariff;
  const base = (units: number) =>
    Math.min(units, t.firstTierLimit) * t.firstTierRate +
    Math.max(0, units - t.firstTierLimit) * t.additionalRate;
  // Dominica zero-rates fuel surcharge and the first 150 kWh of base energy.
  return base(kwh) + kwh * t.fuelAdjustment +
    Math.max(0, base(kwh) - base(t.vatFreeKwh)) * t.vatRate;
}

export function consumptionFromBill(bill: number, config = ANTIGUA_CONFIG) {
  const t = config.tariff;
  // Split at both base-rate and VAT boundaries; fuel is never subject to VAT.
  const boundaries = [...new Set([0, t.firstTierLimit, t.vatFreeKwh])].sort((a, b) => a - b);
  for (let index = 0; index < boundaries.length; index++) {
    const start = boundaries[index];
    const end = boundaries[index + 1] ?? Infinity;
    if (end !== Infinity && bill > billFromConsumption(end, config)) continue;
    const baseRate = start < t.firstTierLimit ? t.firstTierRate : t.additionalRate;
    const slope = baseRate * (start >= t.vatFreeKwh ? 1 + t.vatRate : 1) + t.fuelAdjustment;
    return start + (bill - billFromConsumption(start, config)) / slope;
  }
  return NaN;
}

export function billBounds(config = ANTIGUA_CONFIG) {
  return {
    min: billFromConsumption(config.consumption.min, config),
    max: billFromConsumption(config.consumption.max, config),
  };
}

/** Numeric input accepts ordinary decimal notation with up to two decimal places. */
export function parseInput(text: string): number | null {
  if (!/^\d+(?:\.\d{0,2})?$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function calculate(
  value: number | null,
  mode: InputMode,
  config = ANTIGUA_CONFIG,
) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return { status: "invalid" as const };
  }
  const rawKwh = mode === "bill" ? consumptionFromBill(value, config) : value;
  if (
    rawKwh < config.consumption.min - EPSILON ||
    rawKwh > config.consumption.max + EPSILON
  ) {
    return { status: "out-of-range" as const };
  }
  const kwh = Math.min(
    config.consumption.max,
    Math.max(config.consumption.min, rawKwh),
  );
  const system = config.packages.find((item) => kwh <= item.maxKwh + EPSILON);
  if (!system) return { status: "out-of-range" as const };
  const bill = mode === "bill" ? value : billFromConsumption(kwh, config);
  const monthlySaving = bill * config.savingsFraction;
  const annualSaving = monthlySaving * 12;
  // Starting package cost / assumed annual savings: not an engineered yield or quote.
  const price = system.priceFromEc;
  const years = price / annualSaving;
  return {
    status: "ready" as const,
    kwh,
    bill,
    system,
    monthlySaving,
    annualSaving,
    remainingBill: bill - monthlySaving,
    years,
    price,
    backupHours:
      (system.batteryKwh *
        config.backup.usableFraction *
        config.backup.efficiency) /
      config.backup.loadKw,
    // Rounded visible values still add up exactly to the visible original bill.
    displayBill: Math.round(bill),
    displaySaving: Math.round(monthlySaving),
    displayRemaining: Math.round(bill) - Math.round(monthlySaving),
  };
}
