import { createInterface } from "node:readline/promises";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ENDPOINT, configurations, sanitize, deriveModel } from "./pvwatts-model.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
let secret;

async function request(config) {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams(config.request);
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetch(url, { headers: { "X-Api-Key": secret }, signal: AbortSignal.timeout(45000), redirect: "error" });
    } catch {
      if (attempt === 2) throw new Error("API network/timeout failure (3 attempts)");
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      if (attempt < 2 && [429, 500, 502, 503, 504].includes(response.status)) {
        const seconds = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 30) * 1000 : 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`API HTTP ${response.status}; response body omitted to protect credentials`);
    }
    try { return sanitize(await response.json(), secret); }
    catch { throw new Error("API returned invalid JSON"); }
  }
}

async function main() {
  if (process.argv.includes("--key-stdin")) {
    // The caller must disable terminal echo; terminal:false prevents readline echo too.
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    secret = (await rl.question("API key (stdin; disable terminal echo): ")).trim();
    rl.close();
  } else secret = process.env.PVWATTS_API_KEY?.trim();
  if (!secret) throw new Error("Set PVWATTS_API_KEY or use --key-stdin; never use a NEXT_PUBLIC variable");
  const horizontalOnly = process.argv.includes("--horizontal-only");
  const configs = configurations().filter(c => !horizontalOnly || c.request.tilt === 0);
  const originalPath = "hoymiles_gooo_Glorida_generation_curve.json";
  const original = await readFile(path.join(root, originalPath));
  // Validate credentials and the entire first payload before creating any archive directory.
  const first = await request(configs[0]);
  deriveModel(first, configs[0], new Date().toISOString());
  const runId = new Date().toISOString().replaceAll(":", "-");
  const relativeRun = `data/solar-generation/pvwatts-v8/${runId}`;
  const run = path.join(root, relativeRun);
  await mkdir(run, { recursive: true });
  const manifest = { schema_version: 1, status: "collecting", started_at: new Date().toISOString(),
    expected_models: configs.length, collection_scope: horizontalOnly ? "horizontal_supplement" : "full",
    source_documentation: [
      "https://developer.nlr.gov/docs/solar/pvwatts/v8/",
      "https://samrepo.nlr.gov/help/weather_time_convention.html"],
    legacy_hoymiles: { path: originalPath, sha256: hash(original), geometry_status: "unknown",
      latitude: null, longitude: null, tilt_degrees: null, azimuth_degrees: null,
      note: "Original preserved unchanged. No geographical or orientation assumption inferred from project name." },
    models: [] };
  async function save(relative, value, exclusive = true) {
    const serialized = JSON.stringify(value, null, relative === "manifest.json" || relative.endsWith("curve.json") ? 2 : undefined) + "\n";
    if (serialized.includes(secret)) throw new Error("Credential safety check failed; nothing written");
    const target = path.join(run, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, serialized, { flag: exclusive ? "wx" : "w" });
    return hash(serialized);
  }
  await save("manifest.json", manifest);
  console.log(`Archive: ${relativeRun}`);
  for (const [index, config] of configs.entries()) {
    const raw = index === 0 ? first : await request(config);
    const model = deriveModel(raw, config, new Date().toISOString());
    const rawPath = `${config.id}/raw.sanitized.json`;
    const curvePath = `${config.id}/curve.json`;
    const rawHash = await save(rawPath, raw);
    const curveHash = await save(curvePath, model);
    manifest.models.push({ id: config.id, raw: rawPath, curve: curvePath,
      raw_sha256: rawHash, curve_sha256: curveHash, annual_generation_kwh: model.annual_generation_kwh,
      warnings: raw.warnings, validation: model.validation });
    await save("manifest.json", manifest, false);
    console.log(`${index + 1}/${configs.length} ${config.id}: ${model.annual_generation_kwh.toFixed(2)} kWh/kWp/year; ${raw.warnings.length} warnings`);
  }
  if (hash(await readFile(path.join(root, originalPath))) !== hash(original)) throw new Error("Original Hoymiles file changed during collection");
  manifest.status = "complete";
  manifest.completed_at = new Date().toISOString();
  await save("manifest.json", manifest, false);
  console.log(`Complete: ${configs.length} validated models; credentials excluded; existing application unchanged.`);
}
main().catch(error => {
  console.error(sanitize(error.message, secret));
  process.exitCode = 1;
});
