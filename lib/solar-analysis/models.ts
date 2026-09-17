export type SolarSource = "pvwatts" | "hoymiles";
export type SolarRegion = "antigua" | "dominica";
export type Orientation = "north" | "east" | "south" | "west";
export type Tilt = 0 | 10 | 15 | 20 | 30;
export type Mounting = "roof" | "open-rack";
export type Installation = { source: SolarSource; region: SolarRegion; orientation: Orientation; tilt: Tilt; mounting: Mounting };
export const DEFAULT_INSTALLATION: Installation = { source: "pvwatts", region: "antigua", orientation: "south", tilt: 15, mounting: "roof" };
export const REGION_LABELS = { antigua: "安提瓜", dominica: "多米尼克" };
export const DIRECTION_LABELS = { north: "北", east: "东", south: "南", west: "西" };
export const TILTS: Tilt[] = [0, 10, 15, 20, 30];
export function modelId(config: Installation) {
  if (config.source === "hoymiles") return "hoymiles";
  if (config.tilt === 0) return `${config.region}/horizontal/tilt-0/${config.mounting}`;
  if (config.mounting !== "roof") throw new Error("尚未采集倾斜通风支架模型");
  return `${config.region}/${config.orientation}/tilt-${config.tilt}`;
}
export function installationLabel(config: Installation) {
  if (config.source === "hoymiles") return "禾迈原项目 · 地点 / 朝向 / 倾角未知";
  return `PVWatts · ${REGION_LABELS[config.region]} · ${config.tilt === 0 ? "水平 0° · 朝向不适用" : `朝${DIRECTION_LABELS[config.orientation]} · ${config.tilt}°`} · ${config.mounting === "roof" ? "屋顶" : "通风支架"}`;
}
export type GenerationModel = {
  id: string;
  source: SolarSource;
  referenceCapacityKwp: number;
  // Only this selected model's DC series is returned after password verification.
  dcPowerW?: number[];
  averageDayWh?: number[][];
  weatherSource: string;
};
