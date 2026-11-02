import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("design/flyers/ai-series-2026-09");
const formats = ["flyer-color", "flyer-bw", "poster", "billboard"];
const labels = {
  "flyer-color": "COLOUR FLYERS",
  "flyer-bw": "B&W FLYERS",
  poster: "POSTERS",
  billboard: "BILLBOARDS",
};

for (const country of ["antigua", "dominica"]) {
  for (const format of formats) {
    const landscape = format === "billboard";
    const cellWidth = landscape ? 510 : 400;
    const cellHeight = landscape ? 380 : 580;
    const margin = 18;
    const titleHeight = 76;
    const width = cellWidth * 4;
    const height = titleHeight + cellHeight * 2;
    const layers = [];
    for (let seed = 1; seed <= 8; seed++) {
      const number = String(seed).padStart(2, "0");
      const file = path.join(root, `seed-${number}`, `${country}-${format}.png`);
      await access(file);
      const x = ((seed - 1) % 4) * cellWidth + margin;
      const y = titleHeight + Math.floor((seed - 1) / 4) * cellHeight + margin;
      const label = Buffer.from(`<svg width="${cellWidth - 2 * margin}" height="42"><rect width="100%" height="100%" fill="#082c36"/><text x="13" y="30" font-family="DejaVu Sans, Arial" font-size="23" font-weight="700" fill="white">SEED ${number}</text></svg>`);
      const thumb = await sharp(file).resize(cellWidth - 2 * margin, cellHeight - 2 * margin - 46, { fit: "contain", background: "#fff" }).jpeg({ quality: 88 }).toBuffer();
      layers.push({ input: label, left: x, top: y });
      layers.push({ input: thumb, left: x, top: y + 46 });
    }
    const countryLabel = country === "antigua" ? "ANTIGUA &amp; BARBUDA" : "DOMINICA";
    const heading = Buffer.from(`<svg width="${width}" height="${titleHeight}"><rect width="100%" height="100%" fill="#fff"/><text x="22" y="53" font-family="DejaVu Sans, Arial" font-size="38" font-weight="700" fill="#082c36">${countryLabel} / ${labels[format].replaceAll("&", "&amp;")}</text></svg>`);
    layers.push({ input: heading, left: 0, top: 0 });
    const output = path.join(root, `preview-${country}-${format}.jpg`);
    await sharp({ create: { width, height, channels: 3, background: "#eaf0f0" } })
      .composite(layers).jpeg({ quality: 90 }).toFile(output);
    console.log(output);
  }
}

await writeFile(path.join(root, "PREVIEW-INDEX.md"), [
  "# AI-generated campaign contact sheets",
  "",
  ...["antigua", "dominica"].flatMap((country) => formats.map((format) => `- ${country} / ${labels[format]}: [preview-${country}-${format}.jpg](preview-${country}-${format}.jpg)`)),
  "",
  "These are concept previews only. QR codes and small text inside AI-generated artwork require production proofing before distribution.",
  "",
].join("\n"));
