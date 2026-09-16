"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EChart from "./echart";
import curve from "../../hoymiles_gooo_Glorida_generation_curve.json";

const INVERTERS = [3.8, 4.8, 6, 7.6, 9.6, 11.5];
const BATTERIES = [0, 5, 10, 15, 20];
const BATTERY_POWER_PER_KWH = 0.5;
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const HOURS = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, "0")}:00`,
);
const PROFILES = {
  daytime: { name: "白天用电", values: [1.9,1.7,1.6,1.5,1.5,2,2.6,3.6,5.1,6.4,7.4,7.9,7.9,7.9,7.6,7.1,6.6,4.9,3.9,3.1,2.6,2.1,1.7,1.4] },
  rush: { name: "白天高峰", values: [2,1.4,1.3,1.2,1.3,1.5,3.5,6.2,7.7,7.2,5.2,4.4,4,3.8,3.8,3.8,3.8,7.3,7.8,7.8,6,4,3,2] },
  evening: { name: "傍晚高峰", values: [1.56,1.45,1.45,1.34,1.34,2,2.78,4.23,4.45,4.45,4.45,4.79,4.23,3.9,3.67,3.34,3.34,5.57,7.57,7.8,8.23,8.41,7.96,1.69] },
  night: { name: "夜间用电", values: [5.28,5.19,4.41,4.3,3.76,3.76,3.49,3.49,2.8,2.8,2.7,2.7,2.8,3.1,3.1,3.4,3.8,4,5.2,5.3,5.6,5.6,5.3,8.12] },
};
const TOUR_STEPS = [
  {
    target: "solar-step-config",
    title: "输入用电与系统参数",
    description: "输入月用电量或月账单，再选择逆变器、电池、组件功率和超配比。右侧会实时计算组件数量与实际装机容量。",
  },
  {
    target: "solar-step-profile",
    title: "选择每日用电模型",
    description: "点击上方“白天用电、白天高峰、傍晚高峰、夜间用电”4 个按钮，选择最符合用户习惯的具体模式。下方缩略图用于放大查看 24 小时占比。",
  },
  {
    target: "solar-step-hourly",
    title: "选择月份查看逐时信息",
    description: "在 03 逐时能源来源中点击 1–12 月按钮，切换查看不同月份的逐时发电、用电、电池充放电与电网流向。",
  },
  {
    target: "solar-step-monthly",
    title: "查看每个月预估使用量",
    description: "查看 12 个月的光伏发电、家庭用电、电网供电与送电量，并结合系统技术参数理解全年变化。",
  },
  {
    target: "solar-step-key-metrics",
    title: "查看两个关键结果",
    description: "重点查看“光伏发电自用率”和“年度电费节省”。前者反映光伏能源被系统自身利用的比例，后者展示安提瓜和多米尼克预计可节省的年度账单金额与百分比。",
  },
] as const;

type ProfileKey = keyof typeof PROFILES;
type InputMode = "kwh" | "antigua" | "dominica";
type HourFlow = {
  hour: number;
  load: number;
  generation: number;
  pvDirect: number;
  batteryCharge: number;
  battery: number;
  grid: number;
  export: number;
  soc: number;
};

const format = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
const antiguaBill = (kwh: number) =>
  Math.min(kwh, 300) * 1.2 + Math.max(0, kwh - 300) * 1.18;
const antiguaKwh = (bill: number) =>
  bill <= 360 ? bill / 1.2 : 300 + (bill - 360) / 1.18;
const dominicaBase = (kwh: number) =>
  Math.min(kwh, 50) * 0.58 + Math.max(0, kwh - 50) * 0.67 + kwh * 0.33;
const dominicaBill = (kwh: number) => {
  const base = dominicaBase(kwh);
  const exempt = dominicaBase(100);
  return base + Math.max(0, base - exempt) * 0.15;
};
const dominicaKwh = (bill: number) => {
  const exemptBill = dominicaBill(100);
  const preVat = bill > exemptBill
    ? dominicaBase(100) + (bill - exemptBill) / 1.15
    : bill;
  const firstTier = 50 * 0.91;
  return preVat <= firstTier ? preVat / 0.91 : 50 + (preVat - firstTier);
};

function simulateDay(
  generation: number[],
  dailyKwh: number,
  profile: number[],
  batteryKwh: number,
): HourFlow[] {
  const load = profile.map((percent) => dailyKwh * percent / 100);
  const firstSurplus = generation.findIndex((pv, hour) => pv > load[hour]);
  const start = firstSurplus < 0 ? 0 : firstSurplus;
  const order = Array.from({ length: 24 }, (_, index) => (start + index) % 24);
  const flows: HourFlow[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    load: load[hour],
    generation: generation[hour],
    pvDirect: 0,
    batteryCharge: 0,
    battery: 0,
    grid: 0,
    export: 0,
    soc: 0,
  }));
  let stored = 0;
  const chargeEfficiency = 0.95;
  const dischargeEfficiency = 0.95;
  const maxBatteryPowerKw = batteryKwh * BATTERY_POWER_PER_KWH;

  order.forEach((hour) => {
    const item = flows[hour];
    const direct = Math.min(item.generation, item.load);
    item.pvDirect = direct;
    const surplus = item.generation - direct;
    const deficit = item.load - direct;
    if (surplus > 0 && batteryKwh > 0) {
      item.batteryCharge = Math.min(
        surplus,
        maxBatteryPowerKw,
        (batteryKwh - stored) / chargeEfficiency,
      );
      stored += item.batteryCharge * chargeEfficiency;
      item.export = Math.max(0, surplus - item.batteryCharge);
    } else if (deficit > 0 && batteryKwh > 0) {
      item.battery = Math.min(
        deficit,
        maxBatteryPowerKw,
        stored * dischargeEfficiency,
      );
      stored -= item.battery / dischargeEfficiency;
      item.grid = deficit - item.battery;
    } else {
      item.export = Math.max(0, surplus);
      item.grid = Math.max(0, deficit);
    }
    item.soc = stored;
  });
  return flows;
}

function Field({
  label,
  children,
  note,
}: {
  label: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <label className="v2-field">
      <span className="v2-field-label">
        <span>{label}</span>
        {note && <small>{note}</small>}
      </span>
      {children}
    </label>
  );
}

export default function SolarAnalysis() {
  const [inputMode, setInputMode] = useState<InputMode>("kwh");
  const [inputValue, setInputValue] = useState(500);
  const [inverterKw, setInverterKw] = useState(7.6);
  const [batteryKwh, setBatteryKwh] = useState(10);
  const [panelW, setPanelW] = useState(490);
  const [oversize, setOversize] = useState(1.1);
  const [profileKey, setProfileKey] = useState<ProfileKey>("evening");
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [detailProfile, setDetailProfile] = useState<ProfileKey | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    if (tourStep === null) return;
    const target = document.getElementById(TOUR_STEPS[tourStep].target);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [tourStep]);

  const monthlyInputKwh = inputMode === "kwh"
    ? inputValue
    : inputMode === "antigua"
      ? antiguaKwh(inputValue)
      : dominicaKwh(inputValue);
  const dailyKwh = monthlyInputKwh / 30;
  const panelCount = Math.max(
    1,
    Math.ceil(inverterKw * oversize * 1000 / Math.max(panelW, 1)),
  );
  const capacityKwp = panelCount * panelW / 1000;
  const capacityScale = capacityKwp / curve.system.dc_capacity_kwp;

  const months = useMemo(() => curve.months.map((sourceMonth, index) => {
    const generation = sourceMonth.average_day_hourly_generation_wh.map(
      (value) => value * capacityScale / 1000,
    );
    const hourly = simulateDay(
      generation,
      dailyKwh,
      PROFILES[profileKey].values,
      batteryKwh,
    );
    const factor = DAYS[index];
    const sum = (key: keyof HourFlow) =>
      hourly.reduce((total, item) => total + Number(item[key]), 0) * factor;
    const consumption = dailyKwh * factor;
    const grid = sum("grid");
    return {
      month: index + 1,
      days: factor,
      hourly,
      consumption,
      generation: sum("generation"),
      grid,
      export: sum("export"),
      selfUse: consumption - grid,
      antiguaCost: antiguaBill(grid),
      dominicaCost: dominicaBill(grid),
      antiguaBaseline: antiguaBill(consumption),
      dominicaBaseline: dominicaBill(consumption),
    };
  }), [capacityScale, dailyKwh, profileKey, batteryKwh]);

  const annual = useMemo(() => months.reduce((total, item) => ({
    consumption: total.consumption + item.consumption,
    generation: total.generation + item.generation,
    grid: total.grid + item.grid,
    export: total.export + item.export,
    selfUse: total.selfUse + item.selfUse,
    antiguaCost: total.antiguaCost + item.antiguaCost,
    dominicaCost: total.dominicaCost + item.dominicaCost,
    antiguaBaseline: total.antiguaBaseline + item.antiguaBaseline,
    dominicaBaseline: total.dominicaBaseline + item.dominicaBaseline,
  }), {
    consumption: 0,
    generation: 0,
    grid: 0,
    export: 0,
    selfUse: 0,
    antiguaCost: 0,
    dominicaCost: 0,
    antiguaBaseline: 0,
    dominicaBaseline: 0,
  }), [months]);
  const solarSelfUseRatio = annual.generation > 0
    ? (annual.generation - annual.export) / annual.generation
    : 0;
  const antiguaSaving = annual.antiguaBaseline - annual.antiguaCost;
  const dominicaSaving = annual.dominicaBaseline - annual.dominicaCost;
  const month = months[selectedMonth - 1];

  const hourlyOption = useMemo(() => ({
    animation: false,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => `${format(Number(value), 2)} kWh`,
    },
    legend: { top: 2, data: ["光伏直供", "电池供电", "电网供电", "电池充电", "送给电网", "光伏发电", "家庭用电"] },
    grid: { left: 52, right: 24, top: 76, bottom: 40 },
    xAxis: { type: "category", data: HOURS, axisLabel: { interval: 2 } },
    yAxis: { type: "value", name: "kWh", min: 0 },
    series: [
      { name: "光伏直供", type: "bar", stack: "hour-flow", barMaxWidth: 28, data: month.hourly.map((item) => item.pvDirect), itemStyle: { color: "#22a06b" } },
      { name: "电池供电", type: "bar", stack: "hour-flow", barMaxWidth: 28, data: month.hourly.map((item) => item.battery), itemStyle: { color: "#e3a43b" } },
      { name: "电网供电", type: "bar", stack: "hour-flow", barMaxWidth: 28, data: month.hourly.map((item) => item.grid), itemStyle: { color: "#6684b5" } },
      { name: "电池充电", type: "bar", stack: "hour-flow", barMaxWidth: 28, data: month.hourly.map((item) => item.batteryCharge), itemStyle: { color: "#83c9b5" } },
      { name: "送给电网", type: "bar", stack: "hour-flow", barMaxWidth: 28, data: month.hourly.map((item) => item.export), itemStyle: { color: "#b8d4df" } },
      { name: "光伏发电", type: "line", smooth: true, symbol: "none", data: month.hourly.map((item) => item.generation), lineStyle: { color: "#087b69", width: 3 } },
      { name: "家庭用电", type: "line", smooth: true, symbol: "none", data: month.hourly.map((item) => item.load), lineStyle: { color: "#ef8354", width: 3 } },
    ],
  }), [month]);

  const annualOption = useMemo(() => ({
    animation: false,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => `${format(Number(value), 2)} kWh`,
    },
    legend: { top: 2, data: ["光伏自用", "送给电网", "家庭用电", "电网供电"] },
    grid: { left: 54, right: 20, top: 48, bottom: 35 },
    xAxis: { type: "category", data: months.map((item) => `${item.month}月`) },
    yAxis: { type: "value", name: "kWh" },
    series: [
      { name: "光伏自用", type: "bar", stack: "solar-generation", barMaxWidth: 34, data: months.map((item) => Math.max(0, item.generation - item.export)), itemStyle: { color: "#22a06b" } },
      { name: "送给电网", type: "bar", stack: "solar-generation", barMaxWidth: 34, data: months.map((item) => item.export), itemStyle: { color: "#b7d8cc" } },
      { name: "家庭用电", type: "line", smooth: true, data: months.map((item) => item.consumption), lineStyle: { color: "#172d45", width: 3 } },
      { name: "电网供电", type: "bar", barMaxWidth: 34, data: months.map((item) => item.grid), itemStyle: { color: "#6684b5" } },
    ],
  }), [months]);

  const profileOption = (key: ProfileKey, detailed = false) => ({
    animation: false,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => `${format(Number(value), 2)}%`,
    },
    grid: { left: detailed ? 46 : 28, right: 12, top: 18, bottom: detailed ? 38 : 25 },
    xAxis: {
      type: "category",
      data: HOURS,
      axisLabel: {
        interval: 0,
        formatter: (_value: string, index: number) => index % 3 === 0 ? String(index) : "",
      },
    },
    yAxis: {
      type: "value",
      name: detailed ? "%" : "",
      axisLabel: { show: detailed },
      splitLine: { show: detailed },
    },
    series: [{
      type: "line",
      smooth: true,
      symbol: "none",
      data: PROFILES[key].values,
      lineStyle: { color: "#087b69", width: 3 },
      areaStyle: { color: "#c9e9df" },
    }],
  });

  const profileGallery = (
    <div className="inline-profile-details">
      <p>用电模型详情 <small>上方按钮负责选择；缩略图仅用于查看 24 小时百分比。</small></p>
      <div className="v2-profile-grid">
        {(Object.keys(PROFILES) as ProfileKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={profileKey === key ? "active" : ""}
            aria-current={profileKey === key ? "true" : undefined}
            onClick={() => setDetailProfile(key)}
          >
            <span className="profile-card-title">
              <b>{PROFILES[key].name}</b>
              {profileKey === key && <em>当前使用</em>}
            </span>
            <EChart option={profileOption(key)} className="v2-mini-chart" />
            <small>点击查看详细占比</small>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="v2-shell">
      <header className="v2-hero">
        <div>
          <p className="eyebrow">内部 · 专属估算</p>
          <h1>光伏与储能系统分析</h1>
          <p>从月账单、设备配置到全年逐时能量流，一页完成估算。</p>
        </div>
        <div className="hero-actions"><button type="button" className="tour-launch" onClick={() => setTourStep(0)}>使用教程</button><Link href="/" className="secondary">返回首页</Link></div>
      </header>

      <section id="solar-step-config" className={`v2-card input-card ${tourStep === 0 ? "tour-target" : ""}`}>
        <div className="section-title config-title">
          <div><span>01</span><div><h2>输入与系统配置</h2><small>设置用电基准、逆变器、储能和光伏组件</small></div></div>
          <span className="config-help" tabIndex={0}><b>?</b> 计算说明<span role="tooltip">月度用电量或电费统一按 30 天换算为每日用电量；全年每天使用相同的每日用电总量。组件数量按“逆变器功率 × 超配比 ÷ 单块组件功率”向上取整。</span></span>
        </div>
        <div className="config-body">
          <div className="config-input-panel">
            <p className="config-panel-label">参数输入</p>
            <div className="v2-inputs">
              <Field label="输入项目"><select value={inputMode} onChange={(event) => setInputMode(event.target.value as InputMode)}><option value="kwh">月用电量（kWh）</option><option value="antigua">安提瓜月电费（EC$）</option><option value="dominica">多米尼克月电费（EC$）</option></select></Field>
              <Field label={inputMode === "kwh" ? "月用电量" : "月电费"} note={inputMode === "kwh" ? "按 30 天换算" : "东加勒比元 EC$"}><input type="number" min="1" value={inputValue} onChange={(event) => setInputValue(Number(event.target.value))} /></Field>
              <Field label="逆变器"><select value={inverterKw} onChange={(event) => setInverterKw(Number(event.target.value))}>{INVERTERS.map((value) => <option key={value} value={value}>{value} kW</option>)}</select></Field>
              <Field label="电池"><select value={batteryKwh} onChange={(event) => setBatteryKwh(Number(event.target.value))}>{BATTERIES.map((value) => <option key={value} value={value}>{value === 0 ? "无电池" : `${value} kWh`}</option>)}</select></Field>
              <Field label="组件功率（W）"><input type="number" min="100" step="5" value={panelW} onChange={(event) => setPanelW(Number(event.target.value))} /></Field>
              <Field label="超配比（DC/AC）"><input type="number" min=".5" max="2" step=".01" value={oversize} onChange={(event) => setOversize(Number(event.target.value))} /></Field>
            </div>
          </div>
          <aside className="config-preview">
            <div className="config-preview-head"><div><small>实时计算</small><h3>配置预览</h3></div><span>LIVE</span></div>
            <div className="input-results"><span>每日用电 <b>{format(dailyKwh)} kWh</b></span><span>安提瓜月账单 <b>EC$ {format(antiguaBill(monthlyInputKwh))}</b></span><span>多米尼克月账单 <b>EC$ {format(dominicaBill(monthlyInputKwh))}</b></span><span>组件数 <b>{panelCount} 块</b></span><span>实际装机 <b>{format(capacityKwp)} kWp</b></span></div>
            <p className="config-formula">{inverterKw} kW × {format(oversize)} ÷ {panelW} W，向上取整为 {panelCount} 块组件</p>
          </aside>
        </div>
      </section>

      <section id="solar-step-profile" className={`v2-card profile-card ${tourStep === 1 ? "tour-target" : ""}`}>
        <div className="section-title"><div><span>02</span><h2>每日用电模型</h2></div><p>先选择最符合用户习惯的 24 小时用电分布</p></div>
        <div className="profile-picker"><div><strong>选择每日用电模型</strong><small>选择后，逐时图和全年结果会立即重新计算</small></div><div className="profile-choice-area">{tourStep === 1 && <div className="tour-action-hint"><b>↓</b><span>点击下面 4 个按钮，选择具体用电模式</span></div>}<div className={`profile-choices ${tourStep === 1 ? "tour-control-focus" : ""}`} role="group" aria-label="选择每日用电模型">{(Object.keys(PROFILES) as ProfileKey[]).map((key) => <button key={key} type="button" className={profileKey === key ? "active" : ""} aria-pressed={profileKey === key} onClick={() => setProfileKey(key)}>{PROFILES[key].name}</button>)}</div></div></div>
        {profileGallery}
      </section>

      <section id="solar-step-hourly" className={`v2-card hourly-card ${tourStep === 2 ? "tour-target" : ""}`}>
        <div className="section-title"><div><span>03</span><h2>逐时能源来源</h2></div><p>选择月份，查看一天 24 小时的发电、用电、电池与电网流向</p></div>
        <div className="month-choice-area">{tourStep === 2 && <div className="tour-action-hint month-hint"><b>↓</b><span>点击月份按钮，切换查看该月的逐时信息</span></div>}<div className={`month-tabs ${tourStep === 2 ? "tour-control-focus" : ""}`} role="group" aria-label="选择月份">{months.map((item) => <button key={item.month} type="button" className={selectedMonth === item.month ? "active" : ""} onClick={() => setSelectedMonth(item.month)}>{item.month}月</button>)}</div></div>
        <p className="chart-explain">每小时只有一根堆叠柱，依次表示光伏直供、电池供电、电网供电、电池充电和送给电网，不重复计算光伏直供。电池充电与放电功率均限制为每 1 kWh 容量最多 0.5 kW。绿色与橙色拟合曲线分别表示光伏发电和家庭用电，均位于 X 轴上方。</p>
        <EChart option={hourlyOption} className="v2-hourly-chart" />
        <div className="month-strip"><span>本月发电 <b>{format(month.generation)} kWh</b></span><span>本月用电 <b>{format(month.consumption)} kWh</b></span><span>电网供电 <b>{format(month.grid)} kWh</b></span><span>送给电网 <b>{format(month.export)} kWh</b></span></div>
      </section>

      <section id="solar-step-monthly" className={`annual-layout ${tourStep === 3 ? "tour-target" : ""}`}>
        <section className="v2-card annual-chart-card"><div className="section-title"><div><span>04</span><h2>12 个月发电与用电</h2></div><p>光伏柱 = 光伏自用 + 送给电网</p></div><EChart option={annualOption} className="v2-annual-chart" /></section>
        <aside className="v2-card technical"><h2>系统技术统计</h2><dl><div><dt>逆变器 AC 功率</dt><dd>{format(inverterKw)} kW</dd></div><div><dt>组件数量 / 功率</dt><dd>{panelCount} × {panelW} W</dd></div><div><dt>光伏 DC 容量</dt><dd>{format(capacityKwp)} kWp</dd></div><div><dt>实际 DC/AC 比</dt><dd>{format(capacityKwp / inverterKw)}</dd></div><div><dt>电池容量</dt><dd>{format(batteryKwh)} kWh</dd></div><div><dt>电池充/放电功率上限</dt><dd>{format(batteryKwh * BATTERY_POWER_PER_KWH)} kW</dd></div><div><dt>日均用电</dt><dd>{format(dailyKwh)} kWh</dd></div><div><dt>单位装机年发电</dt><dd>{format(annual.generation / capacityKwp)} kWh/kWp</dd></div></dl></aside>
      </section>

      <section id="solar-step-summary" className="summary-section">
        <div className="section-title summary-title"><div><span>05</span><h2>年度汇总信息</h2></div><p>重点结果：光伏发电自用率与年度电费节省</p></div>
        <section id="solar-step-key-metrics" className={`v2-highlights ${tourStep === 4 ? "tour-target" : ""}`}>
          <article><span>光伏发电自用率</span><strong>{format(solarSelfUseRatio * 100)}%</strong><small>（年度光伏发电 − 年度送电网）÷ 年度光伏发电</small></article>
          <article><span>年度电费节省</span><div><p>安提瓜 <b>EC$ {format(antiguaSaving)}</b><em>{format(annual.antiguaBaseline > 0 ? antiguaSaving / annual.antiguaBaseline * 100 : 0)}%</em></p><p>多米尼克 <b>EC$ {format(dominicaSaving)}</b><em>{format(annual.dominicaBaseline > 0 ? dominicaSaving / annual.dominicaBaseline * 100 : 0)}%</em></p></div><small>原年度账单与采用光伏后的电网购电账单之差</small></article>
        </section>
        <section className="v2-summary"><article className="primary"><span>年度光伏发电</span><strong>{format(annual.generation)} kWh</strong></article><article><span>年度家庭用电</span><strong>{format(annual.consumption)} kWh</strong></article><article><span>年度电网供电</span><strong>{format(annual.grid)} kWh</strong><small>安提瓜 EC$ {format(annual.antiguaCost)}<br />多米尼克 EC$ {format(annual.dominicaCost)}</small></article><article><span>年度送给电网</span><strong>{format(annual.export)} kWh</strong></article><article><span>减少电网购电</span><strong>{format(annual.selfUse)} kWh</strong><small>占年度用电 {format(annual.selfUse / annual.consumption * 100)}%</small></article></section>
      </section>

      {detailProfile && <div className="v2-modal" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) setDetailProfile(null); }}><section><button type="button" aria-label="关闭" onClick={() => setDetailProfile(null)}>×</button><div className="profile-modal-head"><div><small>每日用电模型详情</small><h2>{PROFILES[detailProfile].name} · 00:00–24:00</h2></div><button type="button" className={profileKey === detailProfile ? "selected" : ""} disabled={profileKey === detailProfile} onClick={() => setProfileKey(detailProfile)}>{profileKey === detailProfile ? "该模式已选中" : "切换为该模式"}</button></div><EChart option={profileOption(detailProfile, true)} className="v2-detail-chart" /><div className="v2-percent-grid">{PROFILES[detailProfile].values.map((value, hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00–{String(hour + 1).padStart(2, "0")}:00 <b>{format(value)}%</b></span>)}</div></section></div>}
      {tourStep !== null && <><div className="tour-backdrop" aria-hidden="true" /><aside className="tour-panel" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div className="tour-progress"><span>使用教程</span><b>STEP {tourStep + 1} / {TOUR_STEPS.length}</b></div><div className="tour-dots" aria-hidden="true">{TOUR_STEPS.map((_, index) => <i key={index} className={index === tourStep ? "active" : index < tourStep ? "done" : ""} />)}</div><h2 id="tour-title">{TOUR_STEPS[tourStep].title}</h2><p>{TOUR_STEPS[tourStep].description}</p><div className="tour-actions"><button type="button" className="tour-exit" onClick={() => setTourStep(null)}>退出教程</button><div>{tourStep > 0 && <button type="button" className="tour-prev" onClick={() => setTourStep(tourStep - 1)}>上一步</button>}<button type="button" className="tour-next" onClick={() => tourStep === TOUR_STEPS.length - 1 ? setTourStep(null) : setTourStep(tourStep + 1)}>{tourStep === TOUR_STEPS.length - 1 ? "完成" : "下一步"}</button></div></div></aside></>}
    </main>
  );
}
