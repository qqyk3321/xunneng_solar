import { BATTERIES, INVERTERS, type Configuration } from "./optimizer";

export type InverterRating = typeof INVERTERS[number];
export type CostPrices = { inverters: Record<InverterRating, number>; batteryPer5Kwh: number; panelEach: number };
export const DEFAULT_COST_PRICES: CostPrices = { inverters: { 5: 800, 8: 1100, 10: 1200 }, batteryPer5Kwh: 600, panelEach: 100 };
export const DEFAULT_PRICE_MULTIPLIER = 1;
export const USD_PER_CURRENCY_UNIT = { XCD: 0.37, CNY: 0.15 } as const;

const cents = (value: number) => {
  const result = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(result)) throw new Error("请输入有效的非负美元金额。");
  return result;
};

export function convertUsd(value: number) {
  const usdCents = cents(value);
  const xcdCents = Math.round(usdCents / USD_PER_CURRENCY_UNIT.XCD);
  const cnyCents = Math.round(usdCents / USD_PER_CURRENCY_UNIT.CNY);
  if (!Number.isSafeInteger(xcdCents) || !Number.isSafeInteger(cnyCents)) throw new Error("折算金额过大，请调整后重试。");
  return { usd: usdCents / 100, xcd: xcdCents / 100, cny: cnyCents / 100 };
}

export function calculateEquipmentCost(configuration: Pick<Configuration, "inverterKw" | "batteryKwh" | "panelCount">, prices: CostPrices, multiplier: number) {
  if (!INVERTERS.some(rating => rating === configuration.inverterKw) || !BATTERIES.some(capacity => capacity === configuration.batteryKwh) || !Number.isInteger(configuration.panelCount) || configuration.panelCount < 1) throw new Error("当前推荐配置无效。");
  const multiplierTenths = Math.round((multiplier + Number.EPSILON) * 10);
  if (!Number.isFinite(multiplier) || multiplier < 0 || !Number.isSafeInteger(multiplierTenths)) throw new Error("请输入有效的非负价格倍数。");
  for (const rating of INVERTERS) cents(prices.inverters[rating]);
  const inverterCents = cents(prices.inverters[configuration.inverterKw as InverterRating]);
  const batteryUnits = configuration.batteryKwh / 5;
  const batteryCents = batteryUnits * cents(prices.batteryPer5Kwh);
  const panelCents = configuration.panelCount * cents(prices.panelEach);
  const totalCents = inverterCents + batteryCents + panelCents;
  const markedUp = totalCents * multiplierTenths;
  if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(markedUp)) throw new Error("金额或倍数过大，请调整后重试。");
  return { inverterCost: inverterCents / 100, batteryUnits, batteryCost: batteryCents / 100, panelCost: panelCents / 100, totalCost: totalCents / 100, salePrice: Math.round(markedUp / 10) / 100, multiplier: multiplierTenths / 10 };
}
