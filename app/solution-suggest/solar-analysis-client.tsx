"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import EChart from "./echart";
import AnalysisDialog from "./analysis-dialog";
import CostCalculator from "./cost-calculator";
import { modelId } from "@/lib/solution-suggest/models";
import { FIXED_INSTALLATION, PANEL_W, PROFILES, RESERVE_SOC_PERCENT, optimizeSystem, type ProfileKey } from "@/lib/solution-suggest/optimizer";
import { createModelTableLoader } from "@/lib/solution-suggest/model-table-cache";
import type { ModelTable } from "@/lib/solution-suggest/model-table";
import tableManifest from "@/lib/solution-suggest/model-table-manifest.json";
import { BATTERY_POWER_PER_KWH, batteryOperatingWindow } from "@/lib/solution-suggest/simulation";

const AnalysisTour = dynamic(() => import("./analysis-tour"), { ssr: false });
// No storage access or download until this password-authorized component mounts.
const loadModelTable = createModelTableLoader({ ...tableManifest, schemaVersion: 1 });

const HOURS = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, "0")}:00`,
);
const TOUR_STEPS = [
  { target: "solar-input-fields", title: "输入月用电量", description: "填写每月用电量，系统会自动调整推荐设备配置。" },
  { target: "solar-step-profile", title: "选择每日用电模型", description: "选择每日用电模式；点击旁边的小图可查看或切换 24 小时分布。" },
  { target: "solar-step-recommendation", title: "查看推荐配置", description: "这里显示推荐逆变器、电池、组件数量及供电覆盖率。修改输入后会重新计算。" },
  { target: "solar-step-technical", title: "查看系统技术统计", description: "查看实际装机容量、超配比、电池容量和其他技术参数。" },
] as const;


const format = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
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
  const installation = FIXED_INSTALLATION;
  const [table, setTable] = useState<ModelTable | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const selectedModelId = modelId(installation);
  const model = useMemo(() => table?.models.find(item => item.id === selectedModelId) ?? null, [table, selectedModelId]);
  const [inputValue, setInputValue] = useState(300);
  const reserveSocPercent = RESERVE_SOC_PERCENT;
  const panelW = PANEL_W;
  const [profileKey, setProfileKey] = useState<ProfileKey>("night");
  const [detailProfile, setDetailProfile] = useState<ProfileKey | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);

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
    let active = true;
    void loadModelTable().then(data => {
      if (active) { setTable(data); setLoadError(null); }
    }).catch(error => {
      if (active) setLoadError(error instanceof Error ? error.message : "模型表加载失败，请重试。");
    });
    return () => { active = false; };
  }, [retry]);


  const monthlyInputKwh = useDeferredValue(inputValue);
  const calculatedProfile = useDeferredValue(profileKey);
  const optimizing = monthlyInputKwh !== inputValue || calculatedProfile !== profileKey;
  const recommendation = useMemo(() => model ? optimizeSystem(model, monthlyInputKwh, PROFILES[calculatedProfile].values) : null, [model, monthlyInputKwh, calculatedProfile]);
  const ready = recommendation !== null;
  const inverterKw = recommendation?.inverterKw ?? 5;
  const batteryKwh = recommendation?.batteryKwh ?? 5;
  const panelCount = recommendation?.panelCount ?? 0;
  const capacityKwp = recommendation?.capacityKwp ?? 0;
  const dailyKwh = monthlyInputKwh * 12 / 365;
  const { reserveKwh, usableKwh } = batteryOperatingWindow(batteryKwh, reserveSocPercent);
  const annualGeneration = useMemo(() => recommendation?.months.reduce((sum, month) => sum + month.generation, 0) ?? 0, [recommendation]);

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
    <main className="v2-shell compact-analysis" data-solar-authorized="true">
      <header className="v2-hero">
        <div>
          <p className="eyebrow">内部 · 专属估算</p>
          <h1>光伏与储能系统分析</h1>
          <p>输入月用电量与每日用电模型，自动推荐设备配置并查看技术统计。</p>
        </div>
        <div className="hero-actions"><button type="button" className="tour-launch" onClick={() => setTourStep(0)}>使用教程</button><Link href="/" className="secondary" aria-label="返回首页" prefetch={false}>返回首页</Link></div>
      </header>
      <div className="solar-workspace solution-workspace"><div className="solar-workspace-main">
        <section id="solar-step-config" tabIndex={-1} aria-labelledby="parameter-title" className="v2-card parameter-card">
          <div className="section-title parameter-title"><div><h2 id="parameter-title">参数选择</h2></div></div>
          <div className="solution-input-row">
            <div id="solar-input-fields"><div className="v2-inputs"><Field label="月用电量" note="kWh / 月"><input aria-label="月用电量" type="number" min="0" max="1000000" value={inputValue} onChange={event => setInputValue(Math.max(0, Math.min(1000000, Number(event.target.value))))} /></Field></div></div>
            <div id="solar-step-profile" className="compact-profile">
              <Field label="每日用电模型"><select aria-label="选择每日用电模型" value={profileKey} onChange={event => setProfileKey(event.target.value as ProfileKey)}>{(Object.keys(PROFILES) as ProfileKey[]).map(key => <option key={key} value={key}>{PROFILES[key].name}</option>)}</select></Field>
              <button type="button" className="profile-thumbnail" aria-label="查看用电模型详情" onClick={() => setDetailProfile(profileKey)}><EChart option={profileOption(profileKey)} className="compact-profile-chart" /><span>查看 24 小时详情 ↗</span></button>
            </div>
          </div>
        </section>
        {!ready && <section className="v2-card model-loading" aria-live="polite">{loadError ? <><p role="alert">{loadError}</p><button type="button" onClick={() => { setLoadError(null); setRetry(n => n + 1); }}>重新加载模型</button></> : <p role="status">正在加载发电模型表…</p>}<small>优先使用本地缓存；首次访问或版本更新时下载。</small></section>}
        {ready && <>
          <section id="solar-step-recommendation" className="v2-card solution-recommendation" aria-label="自动推荐方案" aria-busy={optimizing} data-testid="solution-recommendation">
            <div className="recommendation-head"><h2>推荐配置</h2>{optimizing && <span role="status">正在调整方案…</span>}</div>
            <div className="recommendation-equipment"><div><span>逆变器</span><strong data-testid="recommended-inverter">{inverterKw} kW</strong></div><div><span>电池</span><strong data-testid="recommended-battery">{batteryKwh} kWh</strong></div><div><span>组件数量</span><strong data-testid="recommended-panels">{panelCount} 块 × 500 W</strong></div></div>
            <div className="recommendation-coverage"><span>全年自主供电 <b data-testid="recommended-coverage">{format(recommendation.coverage * 100)}%</b></span><span>夜间电池供电 <b data-testid="recommended-night">{format(recommendation.nightBatteryShare * 100)}%</b></span><span>最差月份夜间电池 <b data-testid="recommended-worst-night-battery">{format(recommendation.worstNightBatteryShare * 100)}%</b></span></div>
            {monthlyInputKwh === 0 && <p>月用电量为 0，当前没有供电需求。</p>}
          </section>
          <section id="solar-step-technical" className="v2-card technical solution-technical" aria-labelledby="technical-title" data-testid="technical-statistics"><h2 id="technical-title">系统技术统计</h2><dl><div><dt>逆变器 AC 功率</dt><dd>{format(inverterKw)} kW</dd></div><div><dt>组件数量 / 功率</dt><dd>{panelCount} × {panelW} W</dd></div><div><dt>光伏 DC 容量</dt><dd>{format(capacityKwp)} kWp</dd></div><div><dt>实际 DC/AC 比</dt><dd data-testid="technical-ratio">{format(capacityKwp / inverterKw)}</dd></div><div><dt>电池标称容量</dt><dd>{format(batteryKwh)} kWh</dd></div><div><dt>SOC 保留 / 电量</dt><dd>{batteryKwh > 0 ? `${reserveSocPercent}% / ${format(reserveKwh)} kWh` : "—"}</dd></div><div><dt>电池可用容量</dt><dd>{format(usableKwh)} kWh</dd></div><div><dt>电池充/放电功率上限</dt><dd>{format(batteryKwh * BATTERY_POWER_PER_KWH)} kW</dd></div><div><dt>日均用电</dt><dd>{format(dailyKwh)} kWh</dd></div><div><dt>单位装机年发电</dt><dd>{format(annualGeneration / capacityKwp)} kWh/kWp</dd></div></dl></section>
        </>}
        <CostCalculator configuration={recommendation} pending={optimizing} />
      </div>
      </div>
      {detailProfile && <AnalysisDialog title="每日用电模型详情" onClose={() => setDetailProfile(null)}>
        <div className="profile-modal-head"><Field label="查看模型"><select aria-label="详情用电模型" value={detailProfile} onChange={event => setDetailProfile(event.target.value as ProfileKey)}>{(Object.keys(PROFILES) as ProfileKey[]).map(key => <option key={key} value={key}>{PROFILES[key].name}</option>)}</select></Field><button type="button" className={profileKey === detailProfile ? "selected" : ""} disabled={profileKey === detailProfile} onClick={() => setProfileKey(detailProfile)}>{profileKey === detailProfile ? "该模式已选中" : "切换为该模式"}</button></div>
        <EChart option={profileOption(detailProfile, true)} className="v2-detail-chart" />
        <div className="v2-percent-grid">{PROFILES[detailProfile].values.map((value, hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00–{String(hour + 1).padStart(2, "0")}:00 <b>{format(value)}%</b></span>)}</div>
      </AnalysisDialog>}
      {tourStep !== null && <AnalysisTour steps={TOUR_STEPS} index={tourStep} ready={ready} onStepChange={setTourStep} />}
    </main>
  );
}
