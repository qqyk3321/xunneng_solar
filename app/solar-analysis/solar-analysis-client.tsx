"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import EChart from "./echart";
import AnalysisDialog from "./analysis-dialog";
import InstallationPicker from "./installation-picker";
import LiveAnnualSummary from "./annual-snapshot";
import { annualSnapshot } from "@/lib/solar-analysis/annual-summary";
import type { ReportBasis } from "@/lib/solar-analysis/report";
import { DEFAULT_INSTALLATION, SOURCES, installationLabel, modelId, validGenerationModel, type GenerationModel } from "@/lib/solar-analysis/models";
import { BATTERY_POWER_PER_KWH, DAYS, generationSeries, simulateYear } from "@/lib/solar-analysis/simulation";

const AnalysisTour = dynamic(() => import("./analysis-tour"), { ssr: false });

const INVERTERS = [3.8, 4.8, 6, 7.6, 9.6, 11.5];
const BATTERIES = [0, 5, 10, 15, 20];
const EMPTY_MONTH = { hourly: [], generation: 0, consumption: 0, grid: 0, export: 0 };
const HOURS = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, "0")}:00`,
);
const PROFILES = {
  daytime: { name: "白天用电", values: [1.9,1.7,1.6,1.5,1.5,2,2.6,3.6,5.1,6.4,7.4,7.9,7.9,7.9,7.6,7.1,6.6,4.9,3.9,3.1,2.6,2.1,1.7,1.4] },
  rush: { name: "白天高峰", values: [2,1.4,1.3,1.2,1.3,1.5,3.5,6.2,7.7,7.2,5.2,4.4,4,3.8,3.8,3.8,3.8,7.3,7.8,7.8,6,4,3,2] },
  evening: { name: "傍晚高峰", values: [1.56,1.45,1.45,1.34,1.34,2,2.78,4.23,4.45,4.45,4.45,4.79,4.23,3.9,3.67,3.34,3.34,5.57,7.57,7.8,8.23,8.41,7.96,1.69] },
  night: { name: "夜间高峰", values: [5.28,5.19,4.41,4.3,3.76,3.76,3.49,3.49,2.8,2.8,2.7,2.7,2.8,3.1,3.1,3.4,3.8,4,5.2,5.3,5.6,5.6,5.3,8.12] },
};
const TOUR_STEPS = [
  {
    target: "solar-input-fields",
    title: "输入用电与系统参数",
    description: "输入月用电量或月账单，再选择逆变器、电池、组件功率和超配比。右侧会实时计算组件数量与实际装机容量。",
  },
  {
    target: "solar-step-profile",
    title: "选择每日用电模型",
    description: "通过下拉框选择用电模型，旁边的小图预览当前模式。点击小图打开详情弹窗，查看或切换其他模式。",
  },
  {
    target: "solar-step-installation",
    title: "选择数据源与安装条件",
    description: "点击面板倾角和方位按钮完成安装设置。数据源、参考地区及安装方式可通过“修改”弹窗调整。无需点击生成，修改后自动更新右侧结果。",
  },
  {
    target: "solar-live-summary",
    title: "右侧年度速览浮窗",
    description: "这里随参数实时更新：原账单、现账单、节省电量与电费，以及发电和送网占比。国家下拉框只切换电价，不改变安装地区；手机上可展开或收起，详细数据仍在页面下方。",
  },
  {
    target: "solar-month-tabs",
    title: "选择月份查看逐时信息",
    description: "在 02 逐时能源来源中点击 1–12 月按钮，切换查看不同月份的逐时发电、用电、电池充放电与电网流向。",
  },
  {
    target: "solar-monthly-heading",
    title: "查看每个月预估使用量",
    description: "查看 12 个月的光伏发电、家庭用电、电网供电与送电量，并结合系统技术参数理解全年变化。",
  },
  {
    target: "solar-self-use-metric",
    title: "光伏发电自用率",
    description: "发出的电，有多少留给家庭和储能系统使用？自用率 =（光伏发电 − 送给电网）÷ 光伏发电。它不是家庭用电的太阳能覆盖率；免费送网越少，该比例越高。",
  },
  {
    target: "solar-saving-metric",
    title: "年度电费节省",
    description: "这里对比安装前后的年度电网账单，同时给出节省金额和百分比。下方并列展示两国估算；右侧浮窗则只显示你选择的国家。余电按免费送网计算，不计售电收入。",
  },
  {
    target: "solar-report-button",
    title: "生成客户报告 PDF",
    description: "点击框内按钮，选择客户国家并填写称谓、姓名和地址；如提示地区不一致，请先更新方案。点击“生成并预览 PDF”，等待完成后查看 7 页 A4 报告，再下载交给客户。生成时请勿关闭或刷新页面。",
  },
] as const;

type ProfileKey = keyof typeof PROFILES;
type InputMode = "kwh" | "antigua" | "dominica";

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
  const [installation, setInstallation] = useState(DEFAULT_INSTALLATION);
  const [loaded, setLoaded] = useState<GenerationModel | null>(null);
  const [loadError, setLoadError] = useState<{ id: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const selectedModelId = modelId(installation);
  const model = loaded?.id === selectedModelId ? loaded : null;
  const ready = model !== null;
  const [inputMode, setInputMode] = useState<InputMode>("kwh");
  const [inputValue, setInputValue] = useState(300);
  const [inverterKw, setInverterKw] = useState(3.8);
  const [batteryKwh, setBatteryKwh] = useState(5);
  const [panelW, setPanelW] = useState(350);
  const [oversize, setOversize] = useState(1.2);
  const [profileKey, setProfileKey] = useState<ProfileKey>("night");
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [detailProfile, setDetailProfile] = useState<ProfileKey | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [billCountry, setBillCountry] = useState<"antigua" | "dominica">("antigua");
  const [reportBasis, setReportBasis] = useState<ReportBasis | null>(null);
  const [ReportComponent, setReportComponent] = useState<ComponentType<{ basis: ReportBasis; onClose: () => void; onApplyCountry: (country: "antigua" | "dominica") => void }> | null>(null);
  const [reportOpening, setReportOpening] = useState(false);
  const [reportError, setReportError] = useState("");

  // Parameter state resets on entry; do not restore an old scroll position in the installation section.
  // Run only on entry/BFCache restoration, never when a parameter or model changes.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const enter = () => {
      if (["#solar-step-installation", "#solar-step-profile"].includes(window.location.hash)) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("solar-step-config")?.focus({ preventScroll: true });
    };
    const frame = window.requestAnimationFrame(enter);
    const restored = (event: PageTransitionEvent) => { if (event.persisted) enter(); };
    window.addEventListener("pageshow", restored);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", restored);
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let active = true;
    void fetch(`/solar-analysis/model?id=${encodeURIComponent(selectedModelId)}`, {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "模型加载失败");
      if (!validGenerationModel(data) || data.id !== selectedModelId) throw new Error("模型数据不完整，请重试");
      if (active) { setLoaded(data); setLoadError(null); }
    }).catch(error => {
      if (active) setLoadError({ id: selectedModelId, message: error.name === "AbortError" ? "模型加载超时，请重试。" : error.message });
    }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [selectedModelId, retry]);


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
  const months = useMemo(() => {
    if (!model) return [];
    return simulateYear(generationSeries(model, capacityKwp, inverterKw), dailyKwh, PROFILES[profileKey].values, batteryKwh).map(item => {
    const { consumption, grid } = item;
    return {
      ...item,
      antiguaCost: antiguaBill(grid),
      dominicaCost: dominicaBill(grid),
      antiguaBaseline: antiguaBill(consumption),
      dominicaBaseline: dominicaBill(consumption),
    };
    });
  }, [model, capacityKwp, inverterKw, dailyKwh, profileKey, batteryKwh]);

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
  const baselineKwh = dailyKwh * 365;
  const baselineCost = DAYS.reduce((total, days) => total + (billCountry === "antigua" ? antiguaBill : dominicaBill)(dailyKwh * days), 0);
  const snapshot = annualSnapshot(baselineKwh, baselineCost, ready ? {
    grid: annual.grid, cost: billCountry === "antigua" ? annual.antiguaCost : annual.dominicaCost,
    generation: annual.generation, export: annual.export,
  } : null);
  const month = months[selectedMonth - 1] ?? EMPTY_MONTH;

  async function openReport() {
    if (!model || reportOpening) return;
    setReportOpening(true); setReportError(""); setTourStep(null);
    const basis: ReportBasis = { installation, billCountry, inputMode, inputValue, monthlyInputKwh, inverterKw, batteryKwh, panelW, oversize, panelCount, capacityKwp, profileKey, profileValues: [...PROFILES[profileKey].values], months,
      model: { id: model.id, source: model.source, weatherSource: model.weatherSource, historicalYear: model.historicalYear } };
    try {
      const { default: Component } = await import("./report-dialog");
      setReportComponent(() => Component); setReportBasis(structuredClone(basis));
    } catch { setReportError("报告工具加载失败，请检查网络后重试。"); }
    finally { setReportOpening(false); }
  }

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

  return (
    <main className="v2-shell compact-analysis">
      <header className="v2-hero">
        <div>
          <p className="eyebrow">内部 · 专属估算</p>
          <h1>光伏与储能系统分析</h1>
          <p>从月账单、设备配置到全年逐时能量流，一页完成估算。</p>
        </div>
        <div className="hero-actions"><button type="button" className="tour-launch" onClick={() => setTourStep(0)}>使用教程</button><Link href="/" className="secondary" aria-label="返回首页">返回首页</Link></div>
      </header>

      <div className="solar-workspace"><div className="solar-workspace-main">
      <section id="solar-step-config" tabIndex={-1} aria-labelledby="parameter-title" className="v2-card parameter-card">
        <div className="section-title parameter-title"><div><span>01</span><h2 id="parameter-title">参数选择</h2></div><span className="compact-help" tabIndex={0}>计算说明 ⓘ<span role="tooltip">月度用电或电费按 30 天换算每日用电；组件数量按逆变器功率 × 超配比 ÷ 组件功率向上取整。配置与账单预览均显示在右侧。</span></span></div>
        <div id="solar-input-fields"><div className="v2-inputs">
              <Field label="输入项目"><select value={inputMode} onChange={(event) => { const mode = event.target.value as InputMode; setInputMode(mode); if (mode !== "kwh") setBillCountry(mode); }}><option value="kwh">月用电量（kWh）</option><option value="antigua">安提瓜月电费（EC$）</option><option value="dominica">多米尼克月电费（EC$）</option></select></Field>
              <Field label={inputMode === "kwh" ? "月用电量" : "月电费"} note={inputMode === "kwh" ? "按 30 天换算" : "东加勒比元 EC$"}><input type="number" min="0" max="1000000" value={inputValue} onChange={(event) => setInputValue(Math.max(0, Math.min(1000000, Number(event.target.value))))} /></Field>
              <Field label="逆变器"><select value={inverterKw} onChange={(event) => setInverterKw(Number(event.target.value))}>{INVERTERS.map((value) => <option key={value} value={value}>{value} kW</option>)}</select></Field>
              <Field label="电池"><select value={batteryKwh} onChange={(event) => setBatteryKwh(Number(event.target.value))}>{BATTERIES.map((value) => <option key={value} value={value}>{value === 0 ? "无电池" : `${value} kWh`}</option>)}</select></Field>
              <Field label="组件功率（W）"><input type="number" min="100" max="1000" step="5" value={panelW} onChange={(event) => setPanelW(Math.max(100, Math.min(1000, Number(event.target.value))))} /></Field>
              <Field label="超配比（DC/AC）"><input type="number" min=".5" max="2" step=".01" value={oversize} onChange={(event) => setOversize(Math.max(0.5, Math.min(2, Number(event.target.value))))} /></Field>
        </div></div>
        <div id="solar-step-profile" className="compact-profile">
          <Field label="每日用电模型"><select aria-label="选择每日用电模型" value={profileKey} onChange={event => setProfileKey(event.target.value as ProfileKey)}>{(Object.keys(PROFILES) as ProfileKey[]).map(key => <option key={key} value={key}>{PROFILES[key].name}</option>)}</select></Field>
          <button type="button" className="profile-thumbnail" aria-label="查看用电模型详情" onClick={() => setDetailProfile(profileKey)}><EChart option={profileOption(profileKey)} className="compact-profile-chart" /><span>查看 24 小时详情 ↗</span></button>
        </div>
        <InstallationPicker value={installation} onChange={setInstallation} />
        <p className="parameter-auto-note">参数自动计算，修改后实时更新。</p>
      </section>
      {!ready && <section className="v2-card model-loading" aria-live="polite">{loadError?.id === selectedModelId ? <><p role="alert">{loadError.message}</p><button type="button" onClick={() => { setLoadError(null); setRetry(n => n + 1); }}>重新加载模型</button></> : <p role="status">正在加载所选安装条件的数据…</p>}<small>不会用其他朝向、地区或旧模型的结果代替当前选择。</small></section>}
      {ready && <>
      <div className="model-context"><strong>{installationLabel(installation)}</strong><span>{model.source !== "hoymiles" ? "全年 8,760 小时模拟 · 当地 UTC−4 · " : ""}{SOURCES[model.source].note}</span></div>
      <section id="solar-step-hourly" className="v2-card hourly-card">
        <div className="section-title"><div><span>02</span><h2>逐时能源来源</h2></div><p>展示所选月份的平均日流向；年度统计先逐时计算，再汇总</p></div>
        <div className="month-choice-area"><div id="solar-month-tabs" className="month-tabs" role="group" aria-label="选择月份">{months.map((item) => <button key={item.month} type="button" className={selectedMonth === item.month ? "active" : ""} onClick={() => setSelectedMonth(item.month)}>{item.month}月</button>)}</div></div>
        <p className="chart-explain">每小时只有一根堆叠柱，依次表示光伏直供、电池供电、电网供电、电池充电和送给电网，不重复计算光伏直供。电池充电与放电功率均限制为每 1 kWh 容量最多 0.5 kW。绿色与橙色拟合曲线分别表示光伏发电和家庭用电，均位于 X 轴上方。</p>
        <EChart option={hourlyOption} className="v2-hourly-chart" />
        <div className="month-strip"><span>本月发电 <b>{format(month.generation)} kWh</b></span><span>本月用电 <b>{format(month.consumption)} kWh</b></span><span>电网供电 <b>{format(month.grid)} kWh</b></span><span>送给电网 <b>{format(month.export)} kWh</b></span></div>
      </section>

      <section id="solar-step-monthly" className="annual-layout">
        <section className="v2-card annual-chart-card"><div id="solar-monthly-heading" className="section-title"><div><span>03</span><h2>12 个月发电与用电</h2></div><p>光伏柱 = 光伏自用 + 送给电网</p></div><EChart option={annualOption} className="v2-annual-chart" /></section>
        <aside className="v2-card technical"><h2>系统技术统计</h2><dl><div><dt>逆变器 AC 功率</dt><dd>{format(inverterKw)} kW</dd></div><div><dt>组件数量 / 功率</dt><dd>{panelCount} × {panelW} W</dd></div><div><dt>光伏 DC 容量</dt><dd>{format(capacityKwp)} kWp</dd></div><div><dt>实际 DC/AC 比</dt><dd>{format(capacityKwp / inverterKw)}</dd></div><div><dt>电池容量</dt><dd>{format(batteryKwh)} kWh</dd></div><div><dt>电池充/放电功率上限</dt><dd>{format(batteryKwh * BATTERY_POWER_PER_KWH)} kW</dd></div><div><dt>日均用电</dt><dd>{format(dailyKwh)} kWh</dd></div><div><dt>单位装机年发电</dt><dd>{format(annual.generation / capacityKwp)} kWh/kWp</dd></div></dl></aside>
      </section>

      <section id="solar-step-summary" className="summary-section">
        <div className="section-title summary-title"><div><span>04</span><h2>年度汇总信息</h2></div><p>重点结果：光伏发电自用率与年度电费节省</p></div>
        <section id="solar-step-key-metrics" className="v2-highlights">
          <article id="solar-self-use-metric"><span>光伏发电自用率</span><strong>{format(solarSelfUseRatio * 100)}%</strong><small>（年度光伏发电 − 年度送电网）÷ 年度光伏发电</small></article>
          <article id="solar-saving-metric"><span>年度电费节省</span><div><p>安提瓜 <b>EC$ {format(antiguaSaving)}</b><em>{format(annual.antiguaBaseline > 0 ? antiguaSaving / annual.antiguaBaseline * 100 : 0)}%</em></p><p>多米尼克 <b>EC$ {format(dominicaSaving)}</b><em>{format(annual.dominicaBaseline > 0 ? dominicaSaving / annual.dominicaBaseline * 100 : 0)}%</em></p></div><small>原年度账单与采用光伏后的电网购电账单之差</small></article>
        </section>
        <section className="v2-summary"><article className="primary"><span>年度光伏发电</span><strong>{format(annual.generation)} kWh</strong></article><article><span>年度家庭用电</span><strong>{format(annual.consumption)} kWh</strong></article><article><span>年度电网供电</span><strong>{format(annual.grid)} kWh</strong><small>安提瓜 EC$ {format(annual.antiguaCost)}<br />多米尼克 EC$ {format(annual.dominicaCost)}</small></article><article><span>年度送给电网</span><strong>{format(annual.export)} kWh</strong><small>占总发电 {format(annual.generation > 0 ? annual.export / annual.generation * 100 : 0)}% · 免费送网</small></article><article><span>减少电网购电</span><strong>{format(annual.selfUse)} kWh</strong><small>占年度用电 {format(annual.consumption > 0 ? annual.selfUse / annual.consumption * 100 : 0)}%</small></article><article><span>原年度电网账单</span><strong>{format(annual.consumption)} kWh</strong><small>安提瓜 EC$ {format(annual.antiguaBaseline)}<br />多米尼克 EC$ {format(annual.dominicaBaseline)}</small></article></section>
      </section>

      </>}
      </div>
      <LiveAnnualSummary tutorial={tourStep === null ? null : TOUR_STEPS[tourStep].target === "solar-report-button" ? "report" : tourStep === 3 ? "summary" : "other"} snapshot={snapshot} country={billCountry} onCountryChange={setBillCountry} onReport={openReport} reportOpening={reportOpening} reportError={reportError}
        status={!ready ? (loadError?.id === selectedModelId ? "模型加载失败，暂不展示方案结果" : "正在计算所选模型…") : "参数修改后实时更新"}
        configuration={{ dailyKwh, panelCount, panelW, capacityKwp, inverterKw, batteryKwh }}
        context={`${PROFILES[profileKey].name} · ${installationLabel(installation)}`} />
      </div>
      {detailProfile && <AnalysisDialog title="每日用电模型详情" onClose={() => setDetailProfile(null)}>
        <div className="profile-modal-head"><Field label="查看模型"><select aria-label="详情用电模型" value={detailProfile} onChange={event => setDetailProfile(event.target.value as ProfileKey)}>{(Object.keys(PROFILES) as ProfileKey[]).map(key => <option key={key} value={key}>{PROFILES[key].name}</option>)}</select></Field><button type="button" className={profileKey === detailProfile ? "selected" : ""} disabled={profileKey === detailProfile} onClick={() => setProfileKey(detailProfile)}>{profileKey === detailProfile ? "该模式已选中" : "切换为该模式"}</button></div>
        <EChart option={profileOption(detailProfile, true)} className="v2-detail-chart" />
        <div className="v2-percent-grid">{PROFILES[detailProfile].values.map((value, hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00–{String(hour + 1).padStart(2, "0")}:00 <b>{format(value)}%</b></span>)}</div>
      </AnalysisDialog>}
      {tourStep !== null && <AnalysisTour steps={TOUR_STEPS} index={tourStep} ready={ready} onStepChange={setTourStep} />}
      {reportBasis && ReportComponent && <ReportComponent basis={reportBasis} onClose={() => setReportBasis(null)} onApplyCountry={country=>{
        setReportBasis(null); setBillCountry(country); setInstallation(current=>({...current,region:country}));
        if(inputMode!=="kwh"&&inputMode!==country){setInputMode("kwh");setInputValue(monthlyInputKwh);}
      }} />}
    </main>
  );
}
