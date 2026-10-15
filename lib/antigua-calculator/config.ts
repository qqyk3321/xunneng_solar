import { SOLAR_PACKAGES } from "../solar-packages";

/** Provisional business assumptions, not engineering or manufacturer specifications. */
export const ANTIGUA_CONFIG = {
  currency: "EC$",
  tariff: {
    sourceDate: "October 2026",
    fuelAdjustment: 0.88,
    firstTierLimit: 300,
    firstTierRate: 0.4,
    additionalRate: 0.38,
    minimumCharge: 25, // Documented only; outside this model's supported range.
    vatRate: 0,
    vatFreeKwh: 0,
  },
  consumption: { min: 300, max: 2000 },
  savingsFraction: 0.8,
  defaultBill: 1200,
  backup: { loadKw: 1, usableFraction: 0.9, efficiency: 0.9 },
  packages: SOLAR_PACKAGES.map(plan => ({
    maxKwh: plan.homeMaxKwh ?? 2000,
    name: plan.name,
    inverterKw: plan.inverter,
    batteryKwh: plan.battery,
    priceFromEc: plan.priceFromEc,
  })),
};

export type CalculatorConfig = typeof ANTIGUA_CONFIG;

/** Latest substantiated inputs; November 2026 tariff table still unverified. */
export const DOMINICA_CONFIG: CalculatorConfig = {
  ...ANTIGUA_CONFIG,
  tariff: {
    sourceDate: "existing base rates + September 2026 fuel",
    firstTierLimit: 50,
    firstTierRate: 0.58,
    additionalRate: 0.67,
    fuelAdjustment: 0.4338,
    minimumCharge: 2.5,
    vatRate: 0.15,
    vatFreeKwh: 150,
  },
};
