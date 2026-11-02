import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

// The 128 hexadecimal characters are a reproducible design seed, not a link
// token or a claim about the products. Each 16-character segment is assigned
// one of the eight visual directions by lexicographic rank.
const seed = "5f43c531464a1c967dfecae25cd44568369e93fe9ee524655ca1cda969164765df33ca925a74ef325b3ee288a3af3d2f9613d9fe76e3572c362a8a29da7f58e6";
const chunks = seed.match(/.{16}/g);
if (seed.length !== 128 || chunks.length !== 8) throw new Error("Expected a 128-character seed");
const directions = [
  { key: "sunburst", name: "Sunburst / 阳光爆发", layout: "bleed", headline: ["MAKE THE SUN", "WORK FOR YOU."], accent: "#ffb321" },
  { key: "blueprint", name: "Blueprint / 施工蓝图", layout: "framed", headline: ["BUILD YOUR", "OWN POWER."], accent: "#8edbd6" },
  { key: "diagonal", name: "Momentum / 动势斜切", layout: "split", headline: ["TAKE BACK", "YOUR POWER."], accent: "#ffb321" },
  { key: "horizon", name: "Horizon / 海岸地平线", layout: "bleed", headline: ["YOUR ROOF.", "YOUR POWER."], accent: "#9de3de" },
  { key: "spotlight", name: "Spotlight / 聚焦工地", layout: "framed", headline: ["PUT YOUR ROOF", "TO WORK."], accent: "#ffb321" },
  { key: "grid", name: "Grid / 光伏矩阵", layout: "split", headline: ["MORE SUN.", "LESS GRID."], accent: "#8edbd6" },
  { key: "editorial", name: "Editorial / 大字宣言", layout: "bleed", headline: ["POWER STARTS", "AT HOME."], accent: "#ffb321" },
  { key: "signal", name: "Signal / 能量脉冲", layout: "framed", headline: ["SOLAR IS", "YOUR NEXT MOVE."], accent: "#9de3de" },
];
const ranked = chunks.map((chunk, index) => ({ chunk, index })).sort((a, b) => a.chunk.localeCompare(b.chunk));
const styles = chunks.map((chunk, index) => ({ ...directions[ranked.findIndex((item) => item.index === index)], chunk, number: index + 1 }));
const countries = [
  { slug: "antigua", label: "ANTIGUA & BARBUDA", url: "www.solortide.com/antigua", photoTop: 150 },
  { slug: "dominica", label: "DOMINICA", url: "www.solortide.com/dominica", photoTop: 235 },
];
const output = path.resolve("design/flyers/series-v3");
const assets = path.resolve("design/flyers/assets");
const W = 2480;
const H = 3508;
const bwOnly = process.argv.includes("--bw-only");
const postersOnly = process.argv.includes("--posters-only");
const countryFilter = process.argv.find((arg) => arg.startsWith("--country="))?.split("=")[1];
const DARK = "#082c36";
const TEAL = "#007a87";
const GOLD = "#ffb321";

function esc(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}
function text(value, x, y, size, fill, extra = "") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" ${extra}>${esc(value)}</text>`;
}
function image(bytes, x, y, w, h, type = "png") {
  return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/${type};base64,${bytes.toString("base64")}"/>`;
}
function svg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${content}</svg>`;
}
function header(icon, black = false) {
  const ink = black ? "#000" : DARK;
  const amp = black ? "#000" : TEAL;
  return `<rect width="2480" height="300" fill="#fff"/>
    ${image(icon, 125, 77, 138, 138)}
    ${text("Sol", 297, 184, 93, ink, 'font-weight="600" letter-spacing="-4"')}
    ${text("&", 458, 184, 93, amp, 'font-weight="600" letter-spacing="-4"')}
    ${text("Tide", 538, 184, 93, ink, 'font-weight="600" letter-spacing="-4"')}
    ${text("Energy", 774, 184, 50, ink, 'font-weight="500" letter-spacing="0"')}
    <line x1="122" y1="275" x2="2358" y2="275" stroke="${black ? "#000" : "#d4e1e2"}" stroke-width="4"/>`;
}
function motif(style, black = false) {
  const color = black ? "#000" : style.accent;
  if (style.key === "sunburst") return `<circle cx="2110" cy="640" r="300" fill="none" stroke="${color}" stroke-width="45" opacity="0.8"/><circle cx="2110" cy="640" r="190" fill="none" stroke="${color}" stroke-width="17" opacity="0.7"/>`;
  if (style.key === "blueprint") return Array.from({ length: 8 }, (_, i) => `<line x1="${1350 + i * 130}" y1="350" x2="${900 + i * 130}" y2="1200" stroke="${color}" stroke-width="5" opacity="0.48"/>`).join("");
  if (style.key === "diagonal") return `<path d="M1880 300H2480V1120L2300 1160Z" fill="${color}" opacity="0.88"/><path d="M2170 300H2480V860Z" fill="#fff" opacity="0.55"/>`;
  if (style.key === "horizon") return `<line x1="1500" y1="685" x2="2400" y2="685" stroke="${color}" stroke-width="20"/><circle cx="2150" cy="685" r="155" fill="none" stroke="${color}" stroke-width="18"/>`;
  if (style.key === "spotlight") return `<circle cx="2040" cy="665" r="330" fill="none" stroke="${color}" stroke-width="36"/><circle cx="2040" cy="665" r="190" fill="none" stroke="${color}" stroke-width="9"/>`;
  if (style.key === "grid") return Array.from({ length: 7 }, (_, i) => `<line x1="${1500 + i * 145}" y1="320" x2="${1500 + i * 145}" y2="1080" stroke="${color}" stroke-width="5" opacity="0.55"/>`).join("") + Array.from({ length: 5 }, (_, i) => `<line x1="1460" y1="${410 + i * 140}" x2="2450" y2="${410 + i * 140}" stroke="${color}" stroke-width="5" opacity="0.55"/>`).join("");
  if (style.key === "editorial") return `<rect x="2060" y="355" width="300" height="520" fill="${color}"/><rect x="1950" y="460" width="95" height="415" fill="${color}" opacity="0.7"/>`;
  return `<circle cx="2150" cy="650" r="125" fill="none" stroke="${color}" stroke-width="19"/><circle cx="2150" cy="650" r="240" fill="none" stroke="${color}" stroke-width="15"/><circle cx="2150" cy="650" r="355" fill="none" stroke="${color}" stroke-width="11"/>`;
}
function headline(style, x, y, sizes, fill1, fill2) {
  return `${text(style.headline[0], x, y, sizes[0], fill1, 'font-weight="700" letter-spacing="-8"')}
    ${text(style.headline[1], x, y + sizes[0] + 34, sizes[1], fill2, 'font-weight="700" letter-spacing="-9"')}`;
}
async function photo(country, width, height, monochrome = false) {
  const source = path.join(assets, `${country.slug}-install-v2.png`);
  const meta = await sharp(source).metadata();
  const cropHeight = Math.round(meta.width * height / width);
  const top = Math.min(country.photoTop, meta.height - cropHeight);
  let pipeline = sharp(source).extract({ left: 0, top, width: meta.width, height: cropHeight }).resize(width, height);
  if (monochrome) pipeline = pipeline.greyscale().normalize().modulate({ brightness: 1.12 });
  return pipeline.jpeg({ quality: monochrome ? 86 : 85, mozjpeg: true }).toBuffer();
}
function poster(country, style, icon, qr, photoBytes) {
  const accent = style.accent;
  let scene;
  if (style.layout === "bleed") {
    scene = `<rect x="0" y="300" width="2480" height="2400" fill="${DARK}"/>
      ${image(photoBytes, 0, 710, 2480, 1970, "jpeg")}
      <rect x="0" y="300" width="2480" height="505" fill="${DARK}" opacity="0.96"/>
      ${motif(style)}
      ${text(country.label + "  /  SOLAR INSTALLATION", 126, 388, 42, "#bfe9e6", 'font-weight="700" letter-spacing="5"')}
      ${headline(style, 112, 563, [138, 162], "#fff", accent)}
      <rect x="0" y="2510" width="2480" height="200" fill="${DARK}" opacity="0.95"/>
      ${text("SOLAR BUILT FOR REAL ISLAND HOMES.", 128, 2640, 68, "#fff", 'font-weight="700" letter-spacing="-2"')}`;
  } else if (style.layout === "split") {
    scene = `<rect x="0" y="300" width="2480" height="2400" fill="${DARK}"/>
      ${image(photoBytes, 865, 300, 1615, 2410, "jpeg")}
      <rect x="0" y="300" width="920" height="2410" fill="${DARK}"/>
      ${motif(style)}
      ${text(country.label, 104, 450, 39, accent, 'font-weight="700" letter-spacing="4"')}
      ${headline(style, 92, 895, [115, 120], "#fff", accent)}
      <rect x="101" y="1220" width="130" height="18" fill="${accent}"/>
      ${text("SOLAR +", 100, 1500, 75, "#fff", 'font-weight="700"')}
      ${text("BATTERY", 100, 1595, 75, "#fff", 'font-weight="700"')}
      ${text("FOR ISLAND", 100, 1690, 75, "#fff", 'font-weight="700"')}
      ${text("HOMES", 100, 1785, 75, "#fff", 'font-weight="700"')}
      <rect x="860" y="300" width="15" height="2410" fill="${accent}"/>`;
  } else {
    scene = `<rect x="0" y="300" width="2480" height="2440" fill="${DARK}"/>
      ${motif(style)}
      ${text(country.label + "  /  SOLAR INSTALLATION", 132, 410, 42, "#bfe9e6", 'font-weight="700" letter-spacing="5"')}
      ${headline(style, 119, 621, [145, 163], "#fff", accent)}
      ${image(photoBytes, 132, 930, 2216, 1600, "jpeg")}
      <rect x="132" y="2460" width="2216" height="95" fill="${accent}"/>
      ${text("SOLAR BUILT FOR REAL ISLAND HOMES", 165, 2528, 53, DARK, 'font-weight="700" letter-spacing="-1"')}`;
  }
  return svg(`${header(icon)}${scene}
    <rect x="0" y="2710" width="2480" height="798" fill="#fff"/>
    <rect x="130" y="2790" width="115" height="14" fill="${accent}"/>
    ${text("PLAN FOR A SMALLER GRID BILL.", 127, 2908, 59, DARK, 'font-weight="700" letter-spacing="-2"')}
    ${text("GET YOUR FREE SOLAR ASSESSMENT", 127, 3070, 76, TEAL, 'font-weight="700" letter-spacing="-3"')}
    ${text(country.url, 127, 3280, 58, DARK, 'font-weight="700"')}
    ${text("Illustrative imagery. Savings vary by system, use and tariff.", 127, 3420, 27, "#52676b")}
    <rect x="1830" y="2900" width="520" height="520" rx="22" fill="#fff" stroke="#bbd5d7" stroke-width="4"/>
    ${image(qr, 1854, 2924, 472, 472)}`);
}
function flyer(country, style, icon, qr, photoBytes) {
  const accent = style.accent;
  const isSplit = style.layout === "split";
  return svg(`${header(icon)}
    <rect x="0" y="300" width="2480" height="2250" fill="${DARK}"/>
    ${motif(style)}
    ${text(country.label + "  /  SOLAR + BATTERY", 142, 405, 42, accent, 'font-weight="700" letter-spacing="4"')}
    ${headline(style, 128, 635, isSplit ? [143, 153] : [151, 165], "#fff", accent)}
    ${image(photoBytes, isSplit ? 190 : 0, 895, isSplit ? 2100 : 2480, isSplit ? 1540 : 1620, "jpeg")}
    ${isSplit ? `<rect x="190" y="895" width="2100" height="1540" fill="none" stroke="${accent}" stroke-width="16"/>` : `<rect x="0" y="895" width="24" height="1620" fill="${accent}"/>`}
    <rect x="0" y="2480" width="2480" height="40" fill="${accent}"/>
    <rect x="0" y="2520" width="2480" height="988" fill="#fff"/>
    ${text("SOLAR BUILT FOR YOUR HOME.", 137, 2660, 68, DARK, 'font-weight="700" letter-spacing="-2"')}
    ${text("See how your roof could reduce power bought from the grid.", 137, 2750, 42, "#405a60")}
    ${text("FREE INITIAL", 137, 2960, 92, DARK, 'font-weight="700" letter-spacing="-4"')}
    ${text("ASSESSMENT", 137, 3070, 92, TEAL, 'font-weight="700" letter-spacing="-4"')}
    ${text(country.url, 137, 3298, 51, DARK, 'font-weight="700"')}
    ${text("Illustrative imagery. Savings vary by system, use and tariff.", 137, 3435, 26, "#52676b")}
    <rect x="1830" y="2805" width="520" height="520" rx="22" fill="#fff" stroke="#bbd5d7" stroke-width="4"/>
    ${image(qr, 1854, 2829, 472, 472)}`);
}
function blackWhite(country, style, icon, qr, photoBytes) {
  return svg(`<rect width="2480" height="3508" fill="#fff"/>
    <rect x="90" y="90" width="2300" height="3328" fill="none" stroke="#000" stroke-width="6"/>
    ${header(icon, true)}
    ${motif(style, true)}
    ${text(country.label + "  /  SOLAR INSTALLATION", 143, 425, 44, "#000", 'font-weight="700" letter-spacing="3"')}
    ${headline(style, 125, 676, [151, 167], "#000", "#000")}
    ${image(photoBytes, 140, 980, 2200, 1460, "jpeg")}
    <rect x="140" y="2300" width="2200" height="140" fill="#fff" opacity="0.88"/>
    ${text("REAL ROOFTOP SOLAR FOR ISLAND HOMES", 175, 2390, 60, "#000", 'font-weight="700" letter-spacing="-2"')}
    <line x1="140" y1="2510" x2="2340" y2="2510" stroke="#000" stroke-width="6"/>
    ${text("TAKE THE FIRST STEP.", 140, 2680, 94, "#000", 'font-weight="700" letter-spacing="-4"')}
    ${text("FREE SOLAR ASSESSMENT", 140, 2790, 67, "#000", 'font-weight="700" letter-spacing="-2"')}
    ${text("See how solar could reduce grid electricity purchases.", 140, 2910, 42, "#000")}
    ${text(country.url, 140, 3187, 51, "#000", 'font-weight="700"')}
    ${text("Illustrative imagery. Savings vary by system, use and tariff.", 140, 3335, 26, "#000")}
    <rect x="1810" y="2730" width="510" height="510" fill="#fff" stroke="#000" stroke-width="5"/>
    ${image(qr, 1831, 2751, 468, 468)}`);
}
async function exportPrint(dir, filename, artwork, a2 = false, bw = false) {
  const buffer = Buffer.from(artwork);
  const raster = bw
    ? await sharp(buffer, { density: 300 }).resize(W, H).png({ compressionLevel: 9 }).withMetadata({ density: a2 ? 150 : 300 }).toBuffer()
    : await sharp(buffer, { density: 300 }).resize(W, H).jpeg({ quality: 91, mozjpeg: true }).withMetadata({ density: a2 ? 150 : 300 }).toBuffer();
  const extension = bw ? "png" : "jpg";
  await writeFile(path.join(dir, `${filename}.${extension}`), raster);
  const pdf = await PDFDocument.create();
  const pageWidth = a2 ? 1190.55 : 595.28;
  const pageHeight = a2 ? 1683.78 : 841.89;
  const page = pdf.addPage([pageWidth, pageHeight]);
  const embedded = bw ? await pdf.embedPng(raster) : await pdf.embedJpg(raster);
  page.drawImage(embedded, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  await writeFile(path.join(dir, `${filename}.pdf`), await pdf.save());
}

await mkdir(output, { recursive: true });
const icon = await sharp(path.resolve("app/icon.svg")).resize(150, 150).png().toBuffer();
const iconBw = await sharp(icon).greyscale().threshold(145).png().toBuffer();
async function monochromeQr(slug) {
  const original = await readFile(path.join(assets, `${slug}-qr.png`));
  const plate = Buffer.from('<svg width="120" height="120"><rect width="120" height="120" rx="18" fill="#fff"/></svg>');
  const miniLogo = await sharp(path.resolve("app/icon.svg")).resize(80, 80).greyscale().threshold(145).png().toBuffer();
  const qr = await sharp(original).composite([
    { input: plate, left: 440, top: 440 },
    { input: miniLogo, left: 460, top: 460 },
  ]).png().toBuffer();
  await writeFile(path.join(assets, `${slug}-logo-qr-bw-v3.png`), qr);
  return qr;
}
const index = [
  "# Sol & Tide Energy — construction campaign series",
  "",
  `128-character hexadecimal design seed: \`${seed}\``,
  "",
  "Each 16-character chunk gives one variant. Sorting the eight chunks assigns each a distinct visual direction. The same eight directions are used for Antigua & Barbuda and Dominica.",
  "",
  "| Variant | Seed chunk | Direction |",
  "| --- | --- | --- |",
  ...styles.map((style) => `| ${String(style.number).padStart(2, "0")} | \`${style.chunk}\` | ${style.name} |`),
  "",
  "For each region/variant: `poster-a2.jpg` and `.pdf` (A2, 150 DPI), `flyer-a4.jpg` and `.pdf` (A4, 300 DPI), `flyer-bw-a4.png` and `.pdf` (A4, 300 DPI). PDFs should print at actual size. QR codes point to the matching country page. Photos are AI-generated illustrative construction imagery, not documented Sol & Tide projects. The layouts deliberately omit unsubstantiated percentage savings claims.",
  "",
  "See `PRODUCTION-NOTES.md` for the A2/A4 design plan, print instructions, image prompts and claim policy. Preview contact sheets and country PDF ZIP files sit alongside this README.",
  "",
];
for (const country of countries) {
  if (countryFilter && country.slug !== countryFilter) continue;
  const qrColor = await readFile(path.join(assets, `${country.slug}-logo-qr-v2.png`));
  const qrBw = await monochromeQr(country.slug);
  for (const style of styles) {
    const dir = path.join(output, country.slug, `v${String(style.number).padStart(2, "0")}-${style.key}`);
    await mkdir(dir, { recursive: true });
    if (!bwOnly) {
      await exportPrint(dir, "poster-a2", poster(country, style, icon, qrColor, await photo(country, style.layout === "split" ? 1615 : style.layout === "framed" ? 2216 : 2480, style.layout === "split" ? 2410 : style.layout === "framed" ? 1600 : 1970)), true);
      if (!postersOnly) await exportPrint(dir, "flyer-a4", flyer(country, style, icon, qrColor, await photo(country, style.layout === "split" ? 2100 : 2480, style.layout === "split" ? 1540 : 1620)));
    }
    if (!postersOnly) await exportPrint(dir, "flyer-bw-a4", blackWhite(country, style, iconBw, qrBw, await photo(country, 2200, 1460, true)), false, true);
    console.log(`${country.slug} v${String(style.number).padStart(2, "0")}: ${bwOnly ? "B&W flyer" : postersOnly ? "poster" : "poster + colour flyer + B&W flyer"}`);
  }
}
await writeFile(path.join(output, "README.md"), index.join("\n"));
