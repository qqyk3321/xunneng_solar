import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const base = path.resolve("design/flyers/series-v3");
const modes = [
  ["posters", "poster-a2.jpg"],
  ["colour-flyers", "flyer-a4.jpg"],
  ["bw-flyers", "flyer-bw-a4.png"],
];
const cellWidth = 390;
const cellHeight = 600;
const pageWidth = cellWidth * 4;
const pageHeight = cellHeight * 2 + 80;

function labelSvg(title, number, width) {
  return Buffer.from(`<svg width="${width}" height="52"><rect width="${width}" height="52" fill="#082c36"/><text x="17" y="37" font-family="DejaVu Sans,Arial" font-size="24" font-weight="700" fill="#fff">${title}  /  ${String(number).padStart(2, "0")}</text></svg>`);
}

for (const country of ["antigua", "dominica"]) {
  const directories = (await readdir(path.join(base, country), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (directories.length !== 8) throw new Error(`Expected 8 variants for ${country}`);
  for (const [mode, filename] of modes) {
    const layers = [];
    for (const [index, dirname] of directories.entries()) {
      const left = (index % 4) * cellWidth + 14;
      const top = Math.floor(index / 4) * cellHeight + 68;
      const thumbnail = await sharp(path.join(base, country, dirname, filename))
        .resize(360, 510, { fit: "contain", background: "#fff" })
        .jpeg({ quality: 87 }).toBuffer();
      layers.push({ input: thumbnail, left, top: top + 52 });
      layers.push({ input: labelSvg(dirname.split("-").slice(1).join(" ").toUpperCase(), index + 1, 360), left, top });
    }
    const title = Buffer.from(`<svg width="${pageWidth}" height="65"><rect width="${pageWidth}" height="65" fill="#fff"/><text x="20" y="47" font-family="DejaVu Sans,Arial" font-size="36" font-weight="700" fill="#082c36">${country === "antigua" ? "ANTIGUA &amp; BARBUDA" : "DOMINICA"}  /  ${mode.toUpperCase()}</text></svg>`);
    layers.push({ input: title, left: 0, top: 0 });
    await sharp({ create: { width: pageWidth, height: pageHeight, channels: 3, background: "#edf2f3" } })
      .composite(layers)
      .jpeg({ quality: 88 })
      .toFile(path.join(base, `preview-${country}-${mode}.jpg`));
    console.log(`preview-${country}-${mode}.jpg`);
  }
}
