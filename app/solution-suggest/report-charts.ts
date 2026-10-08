import type { EChartsOption } from "echarts";
import type { SolarReport } from "@/lib/solution-suggest/report";
import { loadEChartsRuntime } from "./echart";

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const FLOW_LEGEND = [
  ["PV to home", "#22a06b"], ["Battery to home", "#e3a43b"], ["Grid to home", "#6684b5"],
  ["Battery charge", "#83c9b5"], ["PV generation", "#087b69"], ["Home demand", "#ef8354"],
] as const;
const hours = Array.from({ length: 24 }, (_, h) => String(h));

export function hourlyReportOption(report: SolarReport, month: number): EChartsOption {
  const values = report.months[month].hourly;
  const max = Math.max(1, ...report.months.flatMap(m => m.hourly.map(h => Math.max(h.generation, h.load, h.pvDirect + h.battery + h.grid + h.batteryCharge))));
  const keys = ["pvDirect", "battery", "grid", "batteryCharge"] as const;
  return {
    animation: false, backgroundColor: "#fff", textStyle: { fontFamily: "Arial, sans-serif" },
    grid: { top: 28, left: 46, right: 12, bottom: 32 },
    xAxis: { type: "category", data: hours, axisLabel: { interval: 5, fontSize: 13 }, axisTick: { show: false } },
    yAxis: { type: "value", name: "kWh", min: 0, max: Math.ceil(max * 10) / 10, splitNumber: 3, axisLabel: { fontSize: 12, formatter: v => Number(v).toFixed(1) } },
    series: [
      ...keys.map((key, i) => ({ name: FLOW_LEGEND[i][0], type: "bar" as const, stack: "flow", data: values.map(h => h[key]), itemStyle: { color: FLOW_LEGEND[i][1] } })),
      { name: "PV generation", type: "line", smooth: true, symbol: "none", data: values.map(h => h.generation), lineStyle: { color: "#087b69", width: 3 }, itemStyle: { color: "#087b69" } },
      { name: "Home demand", type: "line", smooth: true, symbol: "none", data: values.map(h => h.load), lineStyle: { color: "#ef8354", width: 3 }, itemStyle: { color: "#ef8354" } },
    ],
  };
}
export function annualReportOption(r: SolarReport): EChartsOption {
  return {
    animation: false, backgroundColor: "#fff", textStyle: { fontFamily: "Arial, sans-serif" },
    legend: { top: 0, textStyle: { fontSize: 13 } }, grid: { left: 65, top: 45, bottom: 30, right: 20 },
    xAxis: { type: "category", data: MONTH_NAMES.map(m => m.slice(0,3)) }, yAxis: { type: "value", name: "kWh", min: 0 },
    series: [
      { name: "PV to home", type: "bar", stack: "supply", data: r.months.map(m => m.hourly.reduce((sum, h) => sum + h.pvDirect * m.days, 0)), itemStyle: { color: "#22a06b" } },
      { name: "Battery to home", type: "bar", stack: "supply", data: r.months.map(m => m.hourly.reduce((sum, h) => sum + h.battery * m.days, 0)), itemStyle: { color: "#e3a43b" } },
      { name: "Grid purchase", type: "bar", stack: "supply", data: r.months.map(m => m.grid), itemStyle: { color: "#6684b5" } },
      { name: "Home demand", type: "line", data: r.months.map(m => m.consumption), smooth: true, symbol: "none", lineStyle: { color: "#ef8354", width: 3 }, itemStyle: { color: "#ef8354" } },
    ],
  };
}
export function profileReportOption(r: SolarReport): EChartsOption {
  const sum = r.profileValues.reduce((a,b) => a+b, 0);
  return { animation: false, backgroundColor: "#fff", textStyle: { fontFamily: "Arial, sans-serif" }, grid: { left: 45, right: 15, top: 30, bottom: 30 },
    xAxis: { type: "category", data: hours, axisLabel: { interval: 2 } }, yAxis: { type: "value", name: "% of daily use", min: 0 },
    series: [{ type: "line", smooth: true, symbol: "none", data: r.profileValues.map(v => v/sum*100), lineStyle: { color: "#087b69", width: 3 }, areaStyle: { color: "#d2ebe2" } }],
  };
}
export async function reportChartPng(option: EChartsOption, width: number, height: number, signal: AbortSignal) {
  signal.throwIfAborted();
  const runtime = await loadEChartsRuntime();
  signal.throwIfAborted();
  const canvas = document.createElement("canvas");
  const chart = runtime.init(canvas, undefined, { renderer: "canvas", width, height, devicePixelRatio: 2 });
  try { chart.setOption(option); return chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" }); }
  finally { chart.dispose(); canvas.width = canvas.height = 0; }
}
