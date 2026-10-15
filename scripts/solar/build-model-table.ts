// Offline, reproducible preprocessing. Never requests a third-party API.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { loadGenerationModel } from "./archive-reader";
import { DAYS } from "../../lib/solution-suggest/simulation";
import { expectedModelIds, tableChecksum, validModelTable, type ModelTable, type TableModel } from "../../lib/solution-suggest/model-table";

async function main() {
  const models: TableModel[] = [];
  for (const id of expectedModelIds()) {
    const model = await loadGenerationModel(id);
    if (!model) throw new Error(`Missing archived model: ${id}`);
    let offset = 0;
    const hourly = model.dcPowerW ?? model.acPowerW;
    const months = model.averageDayWh ?? DAYS.map(count => {
      const day = Array<number>(24).fill(0);
      for (let d = 0; d < count; d++) for (let h = 0; h < 24; h++) day[h] += hourly![offset++] / count;
      return day;
    });
    models.push({ id, source: model.source, referenceCapacityKwp: model.referenceCapacityKwp,
      timeBasis: "monthly-average-day", basis: model.dcPowerW ? "DC" : "AC", weatherSource: model.weatherSource,
      ...(model.historicalYear ? { historicalYear: model.historicalYear } : {}),
      averageDayWh: months.map(day => day.map(wh => Number(wh.toFixed(2)))),
    });
  }
  const table: ModelTable = { schemaVersion: 1, models };
  if (!validModelTable(table)) throw new Error("Invalid generated table");
  const text = JSON.stringify(table);
  const version = createHash("sha256").update(text).digest("hex");
  const url = `/solar-data/models.${version.slice(0, 16)}.json`;
  const manifest = JSON.stringify({ schemaVersion: 1, version, url, checksum: tableChecksum(text), modelCount: models.length }, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (await readFile(`public${url}`, "utf8") !== text || await readFile("lib/solution-suggest/model-table-manifest.json", "utf8") !== manifest) throw new Error("Stale solar table: run npm run solar:prepare");
  } else {
    await mkdir("public/solar-data", { recursive: true });
    await writeFile(`public${url}`, text);
    await writeFile("lib/solution-suggest/model-table-manifest.json", manifest);
  }
  console.log(JSON.stringify({ models: models.length, pointsPerModel: 288, bytes: Buffer.byteLength(text), gzipBytes: gzipSync(text).length, url, checked: process.argv.includes("--check") }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
