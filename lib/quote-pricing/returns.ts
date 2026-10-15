import { billFromConsumption } from "../antigua-calculator/calculate";
import { ANTIGUA_CONFIG, DOMINICA_CONFIG, type CalculatorConfig } from "../antigua-calculator/config";
import type { EnergyMonth } from "../solution-suggest/simulation";

/** Simple payback using dated residential tariff reference inputs.
 * Unpaid exports, maintenance, degradation and financing are not cash savings.
 * Compare monthly bills so tiered rates and VAT thresholds are preserved.
 */
export function estimateReturns(months: Pick<EnergyMonth, "consumption" | "grid">[], quoteXcd: number | null) {
  const consumption = months.reduce((sum, month) => sum + month.consumption, 0);
  const savedKwh = months.reduce((sum, month) => sum + Math.max(0, month.consumption - month.grid), 0);
  const region = (config: CalculatorConfig) => {
    const bill = (kwh: number) => Math.max(config.tariff.minimumCharge, billFromConsumption(kwh, config));
    const annualBeforeXcd = months.reduce((sum, month) => sum + bill(month.consumption), 0);
    const annualAfterXcd = months.reduce((sum, month) => sum + bill(month.grid), 0);
    const annualSavingsXcd = months.reduce((sum, month) => sum + Math.max(0, bill(month.consumption) - bill(month.grid)), 0);
    return {
      annualBeforeXcd,
      annualAfterXcd,
      annualSavingsXcd,
      years: quoteXcd !== null && Number.isFinite(quoteXcd) && quoteXcd >= 0 && annualSavingsXcd > 0 ? quoteXcd / annualSavingsXcd : null,
    };
  };
  return {
    savedKwh,
    savedPercent: consumption > 0 ? Math.min(100, savedKwh / consumption * 100) : 0,
    antigua: region(ANTIGUA_CONFIG),
    dominica: region(DOMINICA_CONFIG),
  };
}
