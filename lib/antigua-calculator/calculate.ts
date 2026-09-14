import { ANTIGUA_CONFIG, type CalculatorConfig } from "./config";

export type InputMode = "bill" | "consumption";
// Only absorbs floating-point noise, never meaningful 0.01 kWh differences.
const EPSILON = 1e-8;

export function billFromConsumption(kwh: number, config = ANTIGUA_CONFIG) {
  const t = config.tariff;
  const beforeVat = (units: number) =>
    Math.min(units, t.firstTierLimit) * t.firstTierRate +
    Math.max(0, units - t.firstTierLimit) * t.additionalRate +
    units * t.fuelAdjustment;
  const subtotal = beforeVat(kwh);
  return subtotal + Math.max(0, subtotal - beforeVat(t.vatFreeKwh)) * t.vatRate;
}

export function consumptionFromBill(bill: number, config = ANTIGUA_CONFIG) {
  const t = config.tariff;
  if (t.vatRate > 0) {
    // Undo VAT above the exempt consumption before reversing the base tiers.
    const exemptBill = billFromConsumption(t.vatFreeKwh, config);
    if (bill > exemptBill)
      bill = exemptBill + (bill - exemptBill) / (1 + t.vatRate);
  }
  const threshold = t.firstTierLimit * (t.firstTierRate + t.fuelAdjustment);
  return bill <= threshold
    ? bill / (t.firstTierRate + t.fuelAdjustment)
    : t.firstTierLimit +
        (bill - threshold) / (t.additionalRate + t.fuelAdjustment);
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

function targetYears(kwh: number, config: CalculatorConfig) {
  const anchors = config.paybackAnchors;
  for (let i = 1; i < anchors.length; i++) {
    const left = anchors[i - 1];
    const right = anchors[i];
    if (kwh <= right.kwh) {
      return (
        left.years +
        ((kwh - left.kwh) / (right.kwh - left.kwh)) * (right.years - left.years)
      );
    }
  }
  return anchors[anchors.length - 1].years;
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
  const years = targetYears(kwh, config);
  return {
    status: "ready" as const,
    kwh,
    bill,
    system,
    monthlySaving,
    annualSaving,
    remainingBill: bill - monthlySaving,
    years,
    price: annualSaving * years,
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
