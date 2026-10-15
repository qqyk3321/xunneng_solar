export const PRICING_FIELDS = [
  { key: "inverter_5kw_usd", label: "5 kW 逆变器成本", unit: "USD / 台", step: "0.01", max: 1000000 },
  { key: "inverter_8kw_usd", label: "8 kW 逆变器成本", unit: "USD / 台", step: "0.01", max: 1000000 },
  { key: "inverter_10kw_usd", label: "10 kW 逆变器成本", unit: "USD / 台", step: "0.01", max: 1000000 },
  { key: "battery_5kwh_usd", label: "电池成本 / 每 5 kWh", unit: "USD", step: "0.01", max: 1000000 },
  { key: "panel_usd", label: "组件成本 / 每块", unit: "USD", step: "0.01", max: 1000000 },
  { key: "price_multiplier", label: "价格倍数", unit: "倍", step: "0.1", max: 100 },
  { key: "compensation_xcd", label: "固定补偿", unit: "EC$ / XCD", step: "0.01", max: 10000000 },
] as const;

export type PricingKey = typeof PRICING_FIELDS[number]["key"];
export type PricingValues = Record<PricingKey, number>;
export type PricingSettings = PricingValues & { id: 1; version: number; updated_at: string };
export const DEFAULT_PRICING: PricingValues = {
  inverter_5kw_usd: 800, inverter_8kw_usd: 1100, inverter_10kw_usd: 1200,
  battery_5kwh_usd: 600, panel_usd: 100, price_multiplier: 4, compensation_xcd: 500,
};

/** Accept decimal form strings or JSON numbers, never coercible empty/boolean values. */
export function parsePricingValues(input: unknown): PricingValues {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("报价参数格式不正确。");
  const source = input as Record<string, unknown>;
  if (Object.keys(source).length !== PRICING_FIELDS.length) throw new Error("请提供完整的七项报价参数。");
  const values = {} as PricingValues;
  for (const field of PRICING_FIELDS) {
    const raw = source[field.key];
    if (typeof raw !== "string" && typeof raw !== "number") throw new Error(`${field.label}不能为空。`);
    const value = String(raw).trim();
    const pattern = field.key === "price_multiplier" ? /^\d+(?:\.\d)?$/ : /^\d+(?:\.\d{1,2})?$/;
    const number = Number(value);
    if (!pattern.test(value) || !Number.isFinite(number) || number > field.max ||
      (field.key === "price_multiplier" && number === 0)) {
      throw new Error(`${field.label}需为${field.key === "price_multiplier" ? "大于 0、最多一位小数" : "非负、最多两位小数"}的数字，且不超过 ${field.max.toLocaleString("en-US")}。`);
    }
    values[field.key] = number;
  }
  return values;
}

/** Exact rational arithmetic: USD cents / 0.37 × multiplier + XCD compensation.
 * Round only the final sum, upward to EC$100; no intermediate currency rounding.
 */
export function estimateQuoteXcd(values: PricingValues, equipment: { inverterKw: 5 | 8 | 10; batteryKwh: number; panelCount: number }) {
  const v = parsePricingValues(values);
  if (![5, 8, 10].includes(equipment.inverterKw) || ![5, 10, 15, 20].includes(equipment.batteryKwh) ||
    !Number.isInteger(equipment.panelCount) || equipment.panelCount < 1 || equipment.panelCount > 24) throw new Error("设备配置无效。");
  const cents = (n: number) => BigInt(Math.round(n * 100));
  const cost = cents(v[`inverter_${equipment.inverterKw}kw_usd`]) +
    cents(v.battery_5kwh_usd) * BigInt(equipment.batteryKwh / 5) + cents(v.panel_usd) * BigInt(equipment.panelCount);
  const numerator = cost * BigInt(Math.round(v.price_multiplier * 10)) * BigInt(10) + cents(v.compensation_xcd) * BigInt(37);
  const denominator = BigInt(370000);
  return Number((numerator + denominator - BigInt(1)) / denominator) * 100;
}
