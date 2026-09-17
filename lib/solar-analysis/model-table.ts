import { modelId, SOURCES, validGenerationModel, type GenerationModel, type SolarSource } from "./models";

export type TableModel = GenerationModel & { timeBasis: "monthly-average-day"; basis: "AC" | "DC"; averageDayWh: number[][] };
export type ModelTable = { schemaVersion: 1; models: TableModel[] };
export type TableManifest = { schemaVersion: 1; version: string; url: string; checksum: string; modelCount: number };

export function expectedModelIds() {
  const ids = ["hoymiles"];
  for (const source of Object.keys(SOURCES) as SolarSource[]) {
    if (source === "hoymiles") continue;
    for (const region of ["antigua", "dominica"] as const) {
      for (const tilt of [10, 15, 20, 30] as const) for (const orientation of ["north", "east", "south", "west"] as const) {
        ids.push(modelId({ source, region, tilt, orientation, mounting: "roof" }));
      }
      for (const mounting of ["roof", "open-rack"] as const) ids.push(modelId({ source, region, tilt: 0, orientation: "south", mounting }));
    }
  }
  return ids.sort();
}

/** Fast corruption check, not a security signature. Works on LAN HTTP without Web Crypto. */
export function tableChecksum(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function validModelTable(value: unknown): value is ModelTable {
  if (!value || typeof value !== "object") return false;
  const table = value as ModelTable;
  const ids = expectedModelIds();
  const keys = new Set(["id", "source", "referenceCapacityKwp", "timeBasis", "basis", "averageDayWh", "weatherSource", "historicalYear"]);
  return table.schemaVersion === 1 && Array.isArray(table.models) && table.models.length === ids.length &&
    table.models.map(m => m?.id).sort().every((id, i) => id === ids[i]) && table.models.every(m =>
      validGenerationModel(m) && m.timeBasis === "monthly-average-day" &&
      typeof m.weatherSource === "string" && m.weatherSource.length <= 200 &&
      m.referenceCapacityKwp === (m.source === "hoymiles" ? 7.84 : 1) &&
      (m.historicalYear === undefined || Number.isInteger(m.historicalYear)) && Object.keys(m).every(k => keys.has(k)));
}

export function parseModelTable(text: string, manifest: TableManifest): ModelTable {
  if (text.length > 1_000_000 || tableChecksum(text) !== manifest.checksum) throw new Error("模型表校验失败，请重新加载。");
  const table: unknown = JSON.parse(text);
  if (!validModelTable(table) || table.models.length !== manifest.modelCount) throw new Error("模型表数据不完整，请重新加载。");
  return table;
}
