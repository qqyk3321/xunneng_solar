import { billBounds } from "./calculate";
import type { CalculatorConfig } from "./config";

// Fixed planning snapshot, verified 23 Sep 2026. No runtime exchange-rate requests.
export const FX_DATE = "22 September 2026";
export const CURRENCIES = {
  USD: { label: "USD · US dollar", prefix: "US$", perEc: 1 / 2.7 },
  EUR: { label: "EUR · Euro", prefix: "€", perEc: 1 / (2.7 * 1.1463) },
  XCD: { label: "EC · East Caribbean dollar", prefix: "EC$", perEc: 1 },
  XCG: { label: "XCG · Caribbean guilder", prefix: "Cg", perEc: 1.79 / 2.7 },
} as const;
export type Currency = keyof typeof CURRENCIES;
export function fromEc(value: number, currency: Currency) {
  return value * CURRENCIES[currency].perEc;
}
export function toEc(value: number, currency: Currency) {
  return value / CURRENCIES[currency].perEc;
}
export function currencyBounds(config: CalculatorConfig, currency: Currency) {
  const bounds = billBounds(config);
  return {
    min: Math.ceil(fromEc(bounds.min, currency)),
    max: Math.floor(fromEc(bounds.max, currency)),
  };
}
export function defaultCurrencyBill(
  config: CalculatorConfig,
  currency: Currency,
) {
  const { min, max } = currencyBounds(config, currency);
  return Math.min(
    max,
    Math.max(min, Math.round(fromEc(config.defaultBill, currency))),
  );
}
export function formatMoney(value: number, currency: Currency) {
  return `${CURRENCIES[currency].prefix} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}
