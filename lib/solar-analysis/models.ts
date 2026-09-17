export const SOURCES = {
  pvwatts: { label: "PVWatts · NSRDB 典型气象年", note: "典型气象年，不是某个真实年份。逐时 DC 按通用 96% 逆变器参考曲线转换并限幅。", mountingNote: "固定屋顶模型；参考地点为圣约翰 / 罗索附近，不代表每一个实际屋顶。", url: "https://developer.nlr.gov/docs/solar/pvwatts/v8/" },
  "pvgis-era5": { label: "PVGIS · ERA5 · 2022", note: "2022 年历史天气样本，不是长期平均。PVGIS 系统输出按容量缩放并限幅，不重复扣除逆变器效率。", mountingNote: "PVGIS 的建筑集成安装假设背面无空气流通，与 PVWatts 屋顶模型不完全等效。地形地平线遮挡由 PVGIS 估计。", url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en" },
  "pvgis-nsrdb": { label: "PVGIS · NSRDB · 2014", note: "2014 年历史天气样本；与 PVWatts 共享 NSRDB 数据体系，不是完全独立的验证。系统输出缩放并限幅。", mountingNote: "PVGIS 5.2 的历史 NSRDB 数据。建筑集成安装假设背面无空气流通，与 PVWatts 屋顶模型不完全等效。", url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en" },
  "nasa-power": { label: "NASA POWER + pvlib · 2022", note: "2022 年 NASA 辐照与气象，经 pvlib 转为发电模型；不是 NASA 直接提供的发电量。网格较粗，仅供参考。", mountingNote: "采用通用组件、SAPM 温度模型和 14% 系统损耗；屋顶按近贴安装估算，不包含实际屋顶或地形遮挡。", url: "https://power.larc.nasa.gov/docs/" },
  hoymiles: { label: "禾迈 · 原项目模型", note: "月平均日重复模拟；原安装参数未知，无法恢复原逆变器削顶损失。", mountingNote: "原项目安装条件未知。", url: "https://designer.hoymiles.com/" },
} as const;
export type SolarSource = keyof typeof SOURCES;
export type SolarRegion = "antigua" | "dominica";
export type Orientation = "north" | "east" | "south" | "west";
export type Tilt = 0 | 10 | 15 | 20 | 30;
export type Mounting = "roof" | "open-rack";
export type Installation = { source: SolarSource; region: SolarRegion; orientation: Orientation; tilt: Tilt; mounting: Mounting };
export const DEFAULT_INSTALLATION: Installation = { source: "pvwatts", region: "antigua", orientation: "south", tilt: 30, mounting: "roof" };
export const REGION_LABELS = { antigua: "安提瓜", dominica: "多米尼克" };
export const DIRECTION_LABELS = { north: "北", east: "东", south: "南", west: "西" };
export const TILTS: Tilt[] = [0, 10, 15, 20, 30];
export function modelId(config: Installation) {
  if (config.source === "hoymiles") return "hoymiles";
  const prefix = config.source === "pvwatts" ? "" : `${config.source}/`;
  if (config.tilt === 0) return `${prefix}${config.region}/horizontal/tilt-0/${config.mounting}`;
  if (config.mounting !== "roof") throw new Error("尚未采集倾斜通风支架模型");
  return `${prefix}${config.region}/${config.orientation}/tilt-${config.tilt}`;
}
export function installationLabel(config: Installation) {
  if (config.source === "hoymiles") return "禾迈原项目 · 地点 / 朝向 / 倾角未知";
  const direction = isApproximateNorth(config) ? "近北（接口回显 1°）" : DIRECTION_LABELS[config.orientation];
  return `${SOURCES[config.source].label} · ${REGION_LABELS[config.region]} · ${config.tilt === 0 ? "水平 0° · 朝向不适用" : `朝${direction} · ${config.tilt}°`} · ${config.mounting === "roof" ? "屋顶" : "通风支架"}`;
}
export function isApproximateNorth(config: Installation) {
  return config.source.startsWith("pvgis-") && config.tilt !== 0 && config.orientation === "north";
}
export type GenerationModel = {
  id: string;
  source: SolarSource;
  referenceCapacityKwp: number;
  // Only this selected model's series is returned after password verification.
  dcPowerW?: number[];
  acPowerW?: number[];
  historicalYear?: number;
  averageDayWh?: number[][];
  weatherSource: string;
};

export function validGenerationModel(value: unknown): value is GenerationModel {
  if (!value || typeof value !== "object") return false;
  const m = value as GenerationModel;
  const numbers = (v: unknown, length: number) => Array.isArray(v) && v.length === length && v.every(n => typeof n === "number" && Number.isFinite(n) && n >= 0);
  if (!Object.hasOwn(SOURCES, m.source) || typeof m.id !== "string" || !Number.isFinite(m.referenceCapacityKwp) || m.referenceCapacityKwp <= 0) return false;
  if (m.source === "hoymiles") return Array.isArray(m.averageDayWh) && m.averageDayWh.length === 12 && m.averageDayWh.every(h => numbers(h, 24));
  if (m.source === "pvgis-era5" || m.source === "pvgis-nsrdb") return numbers(m.acPowerW, 8760);
  return numbers(m.dcPowerW, 8760);
}
