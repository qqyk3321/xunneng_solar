/** Provisional business assumptions, not engineering or manufacturer specifications. */
export const ANTIGUA_CONFIG = {
  currency: "EC$",
  tariff: {
    sourceDate: "June 2026",
    fuelAdjustment: 0.8,
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
  packages: [
    { maxKwh: 600, model: "HYS-3.8LV-USG1", inverterKw: 3.8, batteryKwh: 5 },
    { maxKwh: 850, model: "HYS-4.8LV-USG1", inverterKw: 4.8, batteryKwh: 10 },
    { maxKwh: 1100, model: "HYS-6.0LV-USG1", inverterKw: 6, batteryKwh: 10 },
    { maxKwh: 1400, model: "HYS-7.6LV-USG1", inverterKw: 7.6, batteryKwh: 10 },
    { maxKwh: 1700, model: "HYS-9.6LV-USG1", inverterKw: 9.6, batteryKwh: 10 },
    {
      maxKwh: 2000,
      model: "HYS-11.5LV-USG1",
      inverterKw: 11.5,
      batteryKwh: 10,
    },
  ],
  paybackAnchors: [
    { kwh: 300, years: 4 },
    { kwh: 600, years: 4 },
    { kwh: 850, years: 3.7 },
    { kwh: 1100, years: 3.4 },
    { kwh: 1400, years: 3.1 },
    { kwh: 1700, years: 2.9 },
    { kwh: 2000, years: 2.7 },
  ],
};

export type CalculatorConfig = typeof ANTIGUA_CONFIG;

/** Historical reference scenario, NOT a verified current DOMLEC tariff. */
export const DOMINICA_CONFIG: CalculatorConfig = {
  ...ANTIGUA_CONFIG,
  tariff: {
    sourceDate: "2023 base rates + July 2026 surcharge",
    firstTierLimit: 50,
    firstTierRate: 0.58,
    additionalRate: 0.67,
    fuelAdjustment: 0.33,
    minimumCharge: 2.5,
    vatRate: 0.15,
    vatFreeKwh: 100,
  },
};
