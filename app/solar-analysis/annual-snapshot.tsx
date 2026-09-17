"use client";

import { useState } from "react";
import type { AnnualSnapshot } from "@/lib/solar-analysis/annual-summary";
import { REGION_LABELS, type SolarRegion } from "@/lib/solar-analysis/models";

const display = (n: number | null) => n === null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LiveAnnualSummary({ snapshot: s, country, onCountryChange, status, context }: {
  snapshot: AnnualSnapshot; country: SolarRegion; onCountryChange: (country: SolarRegion) => void;
  status: string; context: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return <aside className={`live-annual-summary ${expanded ? "is-expanded" : ""}`} aria-label="实时年度汇总" data-testid="live-annual-summary">
    <div className="live-summary-head"><div><small>实时估算 · 全年</small><h2>年度账单速览</h2></div><span className="live-summary-indicator">LIVE</span></div>
    <button type="button" className="live-summary-toggle" aria-expanded={expanded} aria-controls="live-summary-body" onClick={() => setExpanded(!expanded)}>
      <span>{REGION_LABELS[country]} · 年省 {s.savedCost === null ? "待计算" : `EC$ ${display(s.savedCost)}`}</span><b>{expanded ? "收起 ↓" : "展开 ↑"}</b>
    </button>
    <div id="live-summary-body" className="live-summary-body">
      <label className="live-country"><span>电费参考国家</span><select aria-label="悬浮汇总国家" value={country} onChange={e => onCountryChange(e.target.value as SolarRegion)}>{Object.entries(REGION_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <p className="live-summary-status" role="status">{status}</p>
      <table><caption>年度电网购电与账单对比</caption><thead><tr><th scope="col">全年</th><th scope="col">电量 kWh</th><th scope="col">电费 EC$</th></tr></thead><tbody>
        <tr><th scope="row">原账单</th><td data-testid="live-baseline-kwh">{display(s.baselineKwh)}</td><td data-testid="live-baseline-cost">{display(s.baselineCost)}</td></tr>
        <tr><th scope="row">现账单</th><td data-testid="live-grid">{display(s.grid)}</td><td data-testid="live-cost">{display(s.cost)}</td></tr>
        <tr className="live-savings-row"><th scope="row">节省</th><td data-testid="live-saved-kwh">{display(s.savedKwh)}</td><td data-testid="live-saved-cost">{display(s.savedCost)}</td></tr>
      </tbody></table>
      <div className="live-saving-rate"><span>年度电费节省</span><strong data-testid="live-saving-percent">{display(s.savingPercent)}{s.savingPercent === null ? "" : "%"}</strong></div>
      <dl className="live-energy-totals">
        <div><dt>发电总量</dt><dd><b data-testid="live-generation">{display(s.generation)}</b> kWh</dd></div>
        <div><dt>送给电网</dt><dd><b data-testid="live-export">{display(s.export)}</b> kWh<small>占发电 <b data-testid="live-export-percent">{display(s.exportPercent)}{s.exportPercent === null ? "" : "%"}</b></small></dd></div>
      </dl>
      <p className="live-summary-context">{context}</p>
      <p className="live-summary-note">全年用电按月输入 ÷ 30 × 365；现账单指电网购电，余电免费送网。金额为东加勒比元，国家切换仅影响电价。</p>
      {s.generation !== null && <a className="live-summary-details" href="#solar-step-summary" onClick={() => setExpanded(false)}>查看年度明细 ↓</a>}
    </div>
  </aside>;
}
