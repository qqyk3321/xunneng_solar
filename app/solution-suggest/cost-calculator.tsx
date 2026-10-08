"use client";

import { useState } from "react";
import { INVERTERS, type Configuration } from "@/lib/solution-suggest/optimizer";
import { calculateEquipmentCost, convertUsd, DEFAULT_COST_PRICES, DEFAULT_PRICE_MULTIPLIER, type CostPrices, type InverterRating } from "@/lib/solution-suggest/cost";

const money = (value: number) => "US$ " + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parse = (value: string) => value.trim() ? Number(value) : NaN;
const normalize = (value: string, digits: number) => Number.isFinite(parse(value)) && parse(value) >= 0 ? (Math.round((parse(value) + Number.EPSILON) * 10 ** digits) / 10 ** digits).toFixed(digits) : value;
const localMoney = (prefix: string, value: number) => prefix + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CurrencyAmounts({ value, testId, prominent = false }: { value: number | null; testId: string; prominent?: boolean }) {
  const converted = value === null ? null : convertUsd(value);
  return <div className="cost-currency-amounts">
    {prominent ? <strong data-testid={testId}>{converted ? money(converted.usd) : "—"}</strong> : <span data-testid={testId}>{converted ? money(converted.usd) : "—"}</span>}
    <span className="cost-converted" data-testid={`${testId}-xcd`}>{converted ? localMoney("EC$ ", converted.xcd) : "—"}</span>
    <span className="cost-converted" data-testid={`${testId}-cny`}>{converted ? localMoney("CN¥ ", converted.cny) : "—"}</span>
  </div>;
}

export default function CostCalculator({ configuration, pending }: { configuration: Pick<Configuration, "inverterKw" | "batteryKwh" | "panelCount"> | null; pending: boolean }) {
  const [inverters, setInverters] = useState<Record<InverterRating, string>>({ 5: String(DEFAULT_COST_PRICES.inverters[5]), 8: String(DEFAULT_COST_PRICES.inverters[8]), 10: String(DEFAULT_COST_PRICES.inverters[10]) });
  const [battery, setBattery] = useState(String(DEFAULT_COST_PRICES.batteryPer5Kwh));
  const [panel, setPanel] = useState(String(DEFAULT_COST_PRICES.panelEach));
  const [multiplier, setMultiplier] = useState(DEFAULT_PRICE_MULTIPLIER.toFixed(1));
  const prices: CostPrices = { inverters: { 5: parse(inverters[5]), 8: parse(inverters[8]), 10: parse(inverters[10]) }, batteryPer5Kwh: parse(battery), panelEach: parse(panel) };
  const invalid = [...Object.values(prices.inverters), prices.batteryPer5Kwh, prices.panelEach, parse(multiplier)].some(value => !Number.isFinite(value) || value < 0);
  let result: ReturnType<typeof calculateEquipmentCost> | null = null;
  let error = invalid ? "请填写完整的非负单价和价格倍数。" : "";
  if (configuration && !invalid) {
    try {
      result = calculateEquipmentCost(configuration, prices, parse(multiplier));
      convertUsd(result.totalCost);
      convertUsd(result.salePrice);
    } catch (cause) { result = null; error = cause instanceof Error ? cause.message : "成本计算失败。"; }
  }

  return <section className="v2-card cost-calculator" aria-labelledby="cost-title" aria-busy={pending} data-testid="cost-calculator">
    <div className="cost-heading"><h2 id="cost-title">成本核算</h2><span>输入美元 · USD</span></div>
    <div className="cost-inputs">
      {INVERTERS.map(rating => <label className="v2-field" key={rating}><span className="v2-field-label">{rating} kW 逆变器成本</span><input aria-label={`${rating} kW 逆变器成本`} type="number" min="0" step="0.01" inputMode="decimal" value={inverters[rating]} onChange={event => setInverters({ ...inverters, [rating]: event.target.value })} onBlur={() => setInverters(current => ({ ...current, [rating]: normalize(current[rating], 2) }))} /></label>)}
      <label className="v2-field"><span className="v2-field-label">电池成本 / 每 5 kWh</span><input aria-label="电池每5kWh成本" type="number" min="0" step="0.01" inputMode="decimal" value={battery} onChange={event => setBattery(event.target.value)} onBlur={() => setBattery(normalize(battery, 2))} /></label>
      <label className="v2-field"><span className="v2-field-label">组件成本 / 每块</span><input aria-label="每块组件成本" type="number" min="0" step="0.01" inputMode="decimal" value={panel} onChange={event => setPanel(event.target.value)} onBlur={() => setPanel(normalize(panel, 2))} /></label>
      <label className="v2-field"><span className="v2-field-label">价格倍数<small>一位小数</small></span><input aria-label="价格倍数" type="number" min="0" step="0.1" inputMode="decimal" value={multiplier} onChange={event => setMultiplier(event.target.value)} onBlur={() => setMultiplier(normalize(multiplier, 1))} /></label>
    </div>
    {configuration && result && <dl className="cost-breakdown">
      <div><dt>逆变器 · {configuration.inverterKw} kW × 1 台</dt><dd><CurrencyAmounts value={result.inverterCost} testId="cost-inverter" /></dd></div>
      <div><dt>电池 · {configuration.batteryKwh} kWh（{result.batteryUnits} × 5 kWh）</dt><dd><CurrencyAmounts value={result.batteryCost} testId="cost-battery" /></dd></div>
      <div><dt>组件 · {configuration.panelCount} 块</dt><dd><CurrencyAmounts value={result.panelCost} testId="cost-panels" /></dd></div>
    </dl>}
    <div className="cost-totals" aria-live="polite"><div><span>总成本</span><CurrencyAmounts value={result?.totalCost ?? null} testId="cost-total" prominent /></div><div className="cost-sale"><span>预计售价{result ? ` · ${result.multiplier.toFixed(1)} 倍` : ""}</span><CurrencyAmounts value={result?.salePrice ?? null} testId="cost-sale-price" prominent /></div></div>
    <p className="cost-note">{pending ? "正在调整方案，当前金额基于上次推荐配置。" : configuration ? "按当前推荐配置核算：总成本 = 逆变器成本 + 电池成本 + 组件成本；售价 = 总成本 × 价格倍数。" : "推荐配置就绪后自动计算成本与售价。"}</p>
    <p className="cost-note">固定汇率：1 东加勒比元（XCD）= US$ 0.37；1 人民币（CNY）= US$ 0.15。</p>
    {error && <p className="cost-error" role="alert">{error}</p>}
  </section>;
}
