// Offline collection/verification only. Never import from application routes.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import catalog from "@/data/solar-generation/catalog.json";
import legacy from "@/hoymiles_gooo_Glorida_generation_curve.json";
import { validGenerationModel, type GenerationModel } from "../../lib/solution-suggest/models";

type Entry = { id: string; raw: string; raw_sha256: string; runtime?: string; runtime_sha256?: string };
const base = path.join(process.cwd(), "data/solar-generation");
export async function loadGenerationModel(id: string): Promise<GenerationModel | null> {
  if (id === "hoymiles") return { id, source: "hoymiles", referenceCapacityKwp: legacy.system.dc_capacity_kwp,
    averageDayWh: legacy.months.map(m => m.average_day_hourly_generation_wh), weatherSource: "禾迈原项目，气象及安装参数未知" };
  // Never construct a filename from caller input: lookup only in the archived allowlist.
  for (const batch of catalog.batches) {
    const manifest = JSON.parse(await readFile(path.join(base, batch.path, "manifest.json"), "utf8"));
    if (manifest.status !== "complete") throw new Error("Archive incomplete");
    const entry = (manifest.models as Entry[]).find(e => e.id === id);
    if (!entry) continue;
    if (entry.runtime) {
      const bytes = await readFile(path.join(base, batch.path, entry.runtime));
      if (createHash("sha256").update(bytes).digest("hex") !== entry.runtime_sha256) throw new Error("Archive hash mismatch");
      const data = JSON.parse(gunzipSync(bytes).toString());
      if (data.id !== id || !validGenerationModel(data)) throw new Error("Invalid archived model");
      return { id, source: data.source, referenceCapacityKwp: data.referenceCapacityKwp,
        weatherSource: data.weatherSource, historicalYear: data.historicalYear,
        ...(data.dcPowerW ? { dcPowerW: data.dcPowerW } : { acPowerW: data.acPowerW }) };
    }
    const bytes = await readFile(path.join(base, batch.path, entry.raw));
    if (createHash("sha256").update(bytes).digest("hex") !== entry.raw_sha256) throw new Error("Archive hash mismatch");
    const raw = JSON.parse(bytes.toString());
    if (raw.outputs.dc.length !== 8760 || !raw.outputs.dc.every((v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0)) throw new Error("Invalid hourly data");
    return { id, source: "pvwatts", referenceCapacityKwp: Number(raw.inputs.system_capacity),
      dcPowerW: raw.outputs.dc, weatherSource: raw.station_info.weather_data_source };
  }
  return null;
}
