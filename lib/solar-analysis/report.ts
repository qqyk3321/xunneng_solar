import { isApproximateNorth, modelId, type GenerationModel, type Installation, type SolarRegion } from "./models";
import { annualBatteryUtilization, batteryOperatingWindow, DAYS, type EnergyMonth } from "./simulation";
import { SUPPORT_EMAILS } from "../site-contact";
import { normalizeReportText, reportCustomerTextError } from "./report-text";

export const REPORT_VERSION = "Solar proposal / 3.0 (monthly-average-day)";
export const REPORT_ADVISOR = "Sol & Tide Energy | Solar & Storage Advisory Team";
export const REPORT_PAGES = ["方案与年度节省", "系统配置", "1–6 月逐时图", "7–12 月逐时图", "年度能源与账单", "估算依据", "后续服务与落款"];
export const REPORT_TITLES = ["", "Mr.", "Ms.", "Mrs.", "Dr."] as const;
export function reportProject(country: SolarRegion) { return `${REPORT_REGIONS[country]} Residential Solar PV Project`; }
export function reportContact(country: SolarRegion) {
  const base = `https://www.solortide.com/${country}`;
  return { email: SUPPORT_EMAILS[country === "antigua" ? "AG" : "DM"], faq: `${base}/faq`, inquiry: `${base}/faq#ask-question` };
}

/** Display-only report reference, never an authentication token. Works on LAN HTTP too. */
export function createReportIdSuffix(randomSource: Pick<Crypto, "getRandomValues"> | null | undefined = globalThis.crypto) {
  const bytes = new Uint8Array(3);
  if (typeof randomSource?.getRandomValues === "function") randomSource.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}

export const REPORT_REGIONS = { antigua: "Antigua", dominica: "Dominica" };
export const REPORT_PROFILES = { daytime: "Daytime use", rush: "Daytime peak", evening: "Evening peak", night: "Night-time peak" };
export const REPORT_SOURCES = {
  pvwatts: "PVWatts V8 / NSRDB typical meteorological year",
  "pvgis-era5": "PVGIS / ERA5 / 2022",
  "pvgis-nsrdb": "PVGIS / NSRDB / 2014",
  "nasa-power": "NASA POWER + pvlib / 2022",
  hoymiles: "Hoymiles / archived project",
};
export type ReportMonth = EnergyMonth & { antiguaCost: number; dominicaCost: number; antiguaBaseline: number; dominicaBaseline: number };
export type ReportBasis = {
  installation: Installation; billCountry: SolarRegion;
  inputMode: "kwh" | SolarRegion; inputValue: number; monthlyInputKwh: number;
  inverterKw: number; batteryKwh: number; reserveSocPercent: number; panelW: number; oversize: number; panelCount: number; capacityKwp: number;
  profileKey: keyof typeof REPORT_PROFILES; profileValues: number[];
  model: Pick<GenerationModel, "id" | "source" | "weatherSource" | "historicalYear" | "timeBasis">;
  dataVersion?: string;
  months: ReportMonth[];
};
export type ReportCustomer = { name: string; address: string; title?: typeof REPORT_TITLES[number] };
export type SolarReport = ReportBasis & {
  customer: ReportCustomer & { project: string; preparedBy: string; salutation: string }; id: string; generatedAt: string; version: string;
  installationText: string; regionMismatch: boolean;
  totals: { consumption: number; generation: number; grid: number; export: number; baselineCost: number; cost: number; savedKwh: number; savedCost: number; savingPercent: number; selfUsePercent: number; exportPercent: number; batteryChargeStored: number; batteryUtilizationPercent: number | null };
};

export function reportInstallation(i: Installation) {
  if (i.source === "hoymiles") return "Original location, tilt, orientation and mounting are unknown";
  const orientation = isApproximateNorth(i) ? "Near north (1 degree east of north)" : ({ north: "North", east: "East", south: "South", west: "West" }[i.orientation]);
  return `${REPORT_REGIONS[i.region]} / ${i.tilt === 0 ? "Horizontal 0 degrees (orientation not applicable)" : `${i.tilt} degrees / ${orientation}`} / ${i.mounting === "roof" ? "Fixed roof" : "Ventilated open rack"}`;
}

export function createSolarReport(basis: ReportBasis, customer: ReportCustomer, generatedAt = new Date(), idSuffix = "") : SolarReport {
  const textError = reportCustomerTextError(customer);
  if (textError) throw new Error(textError);
  if (basis.installation.source !== "hoymiles" && basis.installation.region !== basis.billCountry) throw new Error("客户国家与安装参考地区不一致，请先更新方案后再生成报告。");
  if (basis.model.id !== modelId(basis.installation) || basis.model.source !== basis.installation.source) throw new Error("当前模型尚未就绪，请等待计算完成后重试。");
  const finite = (n: number) => Number.isFinite(n) && n >= 0;
  batteryOperatingWindow(basis.batteryKwh, basis.reserveSocPercent);
  if (!finite(basis.reserveSocPercent)) throw new Error("报告 SOC 参数无效。");
  if (basis.months.length !== 12 || basis.months.some((m, index) => m.month !== index + 1 || m.days !== DAYS[index] || m.hourly.length !== 24 ||
      ![m.consumption, m.generation, m.grid, m.export, m.antiguaCost, m.dominicaCost, m.antiguaBaseline, m.dominicaBaseline, m.batteryChargeStored].every(finite) ||
      (basis.batteryKwh === 0 ? m.batteryUtilizationPercent !== null : m.batteryUtilizationPercent === null || !finite(m.batteryUtilizationPercent) || m.batteryUtilizationPercent > 100 + 1e-8) ||
      m.hourly.some(h => ![h.load, h.generation, h.pvDirect, h.battery, h.batteryCharge, h.grid, h.export].every(finite)))) throw new Error("报告数据不完整，请重新加载模型。");
  if (![basis.inputValue, basis.monthlyInputKwh, basis.inverterKw, basis.batteryKwh, basis.panelW, basis.oversize, basis.panelCount, basis.capacityKwp].every(finite) || basis.profileValues.length !== 24 || !basis.profileValues.every(finite) || basis.profileValues.reduce((a,b) => a+b,0) <= 0) throw new Error("报告参数无效。");
  if (![basis.inverterKw, basis.panelW, basis.oversize, basis.panelCount, basis.capacityKwp].every(n => n > 0) || !Number.isInteger(basis.panelCount)) throw new Error("报告设备参数无效。");
  const clean = (s: string, max: number) => normalizeReportText(s).slice(0, max);
  const frozen = structuredClone(basis);
  const sum = (key: keyof ReportMonth) => basis.months.reduce((a, m) => a + Number(m[key]), 0);
  const consumption = sum("consumption"), generation = sum("generation"), grid = sum("grid"), exported = sum("export");
  const baselineCost = sum(basis.billCountry === "antigua" ? "antiguaBaseline" : "dominicaBaseline");
  const cost = sum(basis.billCountry === "antigua" ? "antiguaCost" : "dominicaCost");
  const name = clean(customer.name, 80);
  const honorific = REPORT_TITLES.includes(customer.title ?? "") ? customer.title ?? "" : "";
  return { ...frozen,
    customer: { name, title: honorific, address: clean(customer.address, 180), preparedBy: REPORT_ADVISOR, project: reportProject(basis.billCountry), salutation: name ? `Dear ${honorific ? honorific + " " : ""}${name},` : "Dear Valued Customer," },
    generatedAt: generatedAt.toISOString(), id: `ST-${generatedAt.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}${idSuffix ? `-${idSuffix.replace(/[^a-z0-9]/gi, "").slice(0,6).toUpperCase()}` : ""}`,
    version: REPORT_VERSION, installationText: reportInstallation(basis.installation),
    regionMismatch: basis.installation.source !== "hoymiles" && basis.installation.region !== basis.billCountry,
    totals: { consumption, generation, grid, export: exported, baselineCost, cost, savedKwh: consumption - grid, savedCost: baselineCost - cost,
      savingPercent: baselineCost > 0 ? (baselineCost - cost) / baselineCost * 100 : 0,
      selfUsePercent: generation > 0 ? (generation - exported) / generation * 100 : 0,
      exportPercent: generation > 0 ? exported / generation * 100 : 0,
      batteryChargeStored: sum("batteryChargeStored"), batteryUtilizationPercent: annualBatteryUtilization(basis.months),
    },
  };
}
