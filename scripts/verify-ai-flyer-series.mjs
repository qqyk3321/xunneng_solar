import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("design/flyers/ai-series-2026-09");
const countries = ["antigua", "dominica"];
const formats = ["flyer-color", "flyer-bw", "poster", "billboard"];
const seen = new Map();
const errors = [];
let checked = 0;

for (let seed = 1; seed <= 8; seed++) {
  const directory = path.join(root, `seed-${String(seed).padStart(2, "0")}`);
  for (const country of countries) {
    for (const format of formats) {
      const file = path.join(directory, `${country}-${format}.png`);
      try {
        const bytes = await readFile(file);
        const meta = await sharp(bytes).metadata();
        const hash = createHash("sha256").update(bytes).digest("hex");
        if (meta.format !== "png") errors.push(`${file}: not a PNG`);
        if (!meta.width || !meta.height) errors.push(`${file}: missing dimensions`);
        if (format === "billboard" && meta.width <= meta.height) errors.push(`${file}: billboard not landscape`);
        if (format !== "billboard" && meta.height <= meta.width) errors.push(`${file}: print artwork not portrait`);
        if (seen.has(hash)) errors.push(`${file}: identical bytes to ${seen.get(hash)}`);
        seen.set(hash, file);
        checked++;
      } catch (error) {
        errors.push(`${file}: ${error.code || error.message}`);
      }
    }
  }
}

console.log(`${checked}/64 image files found; ${seen.size} unique file hashes`);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}
