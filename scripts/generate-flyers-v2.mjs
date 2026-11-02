import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

const WIDTH = 2480;
const HEIGHT = 3508;
const output = path.resolve("design/flyers");
const assets = path.join(output, "assets");
const teal = "#007a87";
const dark = "#082c36";
const gold = "#ffb321";

const countries = [
  {
    slug: "antigua",
    name: "ANTIGUA & BARBUDA",
    headline: ["PUT YOUR ROOF", "TO WORK."],
    url: "www.solortide.com/antigua",
  },
  {
    slug: "dominica",
    name: "DOMINICA",
    headline: ["PUT THE SUN", "ON YOUR SIDE."],
    url: "www.solortide.com/dominica",
  },
];

function xml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character]);
}

function text(value, x, y, size, color, attributes = "") {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" ${attributes}>${xml(value)}</text>`;
}

function img(bytes, x, y, width, height, mime = "png") {
  return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="data:image/${mime};base64,${bytes.toString("base64")}"/>`;
}

function logo(x, y, scale, black = false) {
  const fill = black ? "#fff" : teal;
  const ink = black ? "#000" : "#fff";
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect width="64" height="64" rx="16" fill="${fill}" ${black ? 'stroke="#000" stroke-width="2"' : ""}/>
    <circle cx="32" cy="25" r="12" fill="${black ? "#000" : "#ffd285"}"/>
    <path d="M10 37C18 27 27 47 38 37S50 31 54 34V54H10Z" fill="${fill}"/>
    <path d="M10 37C18 27 27 47 38 37S50 31 54 34" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
    <path d="M14 47C22 40 29 55 40 47S49 43 51 44" fill="none" stroke="${black ? "#000" : "#9de3de"}" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

async function brandedQr(slug, black) {
  const qr = await readFile(path.join(assets, `${slug}-qr.png`));
  const originalLogo = await readFile(path.resolve("app/icon.svg"));
  const renderedLogo = await sharp(originalLogo).resize(132, 132).png().toBuffer();
  const whitePlate = Buffer.from('<svg width="176" height="176"><rect x="2" y="2" width="172" height="172" rx="26" fill="white" stroke="white" stroke-width="4"/></svg>');
  const layers = [
    { input: whitePlate, left: 412, top: 412 },
    { input: renderedLogo, left: 434, top: 434 },
  ];
  const branded = await sharp(qr).composite(layers).png().toBuffer();
  if (!black) {
    await writeFile(path.join(assets, `${slug}-logo-qr-v2.png`), branded);
    return branded;
  }
  const mono = await sharp(branded).greyscale().threshold(145).png().toBuffer();
  await writeFile(path.join(assets, `${slug}-logo-qr-bw-v2.png`), mono);
  return mono;
}

async function hero(slug, monochrome) {
  const source = path.join(assets, `${slug}-install-v2.png`);
  const targetWidth = monochrome ? 2160 : 2480;
  const targetHeight = monochrome ? 1560 : 1760;
  const { width, height } = await sharp(source).metadata();
  const cropHeight = Math.round(width * targetHeight / targetWidth);
  const top = Math.min(slug === "antigua" ? 150 : 235, height - cropHeight);
  const pipeline = sharp(source)
    .extract({ left: 0, top, width, height: cropHeight })
    .resize(targetWidth, targetHeight);
  if (monochrome) pipeline.greyscale().normalize().modulate({ brightness: 1.15 });
  return pipeline.jpeg({ quality: 83, mozjpeg: true }).toBuffer();
}

function colorPoster(country, photo, qr) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2480" height="3508" viewBox="0 0 2480 3508">
    <rect width="2480" height="3508" fill="#fff"/>
    <rect width="2480" height="860" fill="${dark}"/>
    ${logo(152, 103, 2.05)}
    ${text("SOL & TIDE", 324, 174, 72, "#fff", 'font-weight="700" letter-spacing="1"')}
    ${text("ENERGY", 329, 229, 39, gold, 'font-weight="700" letter-spacing="12"')}
    ${text(country.name, 157, 365, 47, "#b5e6e7", 'font-weight="700" letter-spacing="10"')}
    <rect x="155" y="404" width="130" height="14" fill="${gold}"/>
    ${text(country.headline[0], 143, 609, 164, "#fff", 'font-weight="700" letter-spacing="-8"')}
    ${text(country.headline[1], 143, 806, 202, gold, 'font-weight="700" letter-spacing="-10"')}
    ${img(photo, 0, 860, 2480, 1760, "jpeg")}
    <rect x="0" y="860" width="30" height="1760" fill="${gold}"/>
    <rect x="0" y="2410" width="2480" height="210" fill="${dark}" opacity="0.94"/>
    ${text("THE SUN IS ALREADY ON YOUR SIDE.", 136, 2541, 72, "#fff", 'font-weight="700" letter-spacing="-2"')}
    <rect x="0" y="2620" width="2480" height="26" fill="${gold}"/>
    ${text("SOLAR + BATTERY FOR ISLAND HOMES", 142, 2780, 57, dark, 'font-weight="700" letter-spacing="-2"')}
    ${text("See what your roof could do for your power bill.", 142, 2864, 45, "#405a60")}
    ${text("GET YOUR FREE", 142, 3040, 95, dark, 'font-weight="700" letter-spacing="-4"')}
    ${text("SOLAR ASSESSMENT", 142, 3148, 95, teal, 'font-weight="700" letter-spacing="-4"')}
    ${text(country.url, 142, 3327, 49, dark, 'font-weight="700"')}
    ${text("Illustrative imagery. Savings depend on your system, use and tariff.", 142, 3430, 25, "#52676b")}
    <rect x="1830" y="2840" width="520" height="520" rx="25" fill="#fff" stroke="#bbd7d8" stroke-width="4"/>
    ${img(qr, 1853, 2863, 474, 474)}
    ${text("SCAN TO START", 1890, 3394, 30, dark, 'font-weight="700" letter-spacing="2"')}
  </svg>`;
}

function bwPoster(country, photo, qr) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2480" height="3508" viewBox="0 0 2480 3508">
    <rect width="2480" height="3508" fill="#fff"/>
    <rect x="112" y="112" width="2256" height="3284" fill="none" stroke="#000" stroke-width="8"/>
    ${logo(170, 170, 1.8, true)}
    ${text("SOL & TIDE ENERGY", 335, 265, 70, "#000", 'font-weight="700" letter-spacing="1"')}
    <line x1="170" y1="360" x2="2310" y2="360" stroke="#000" stroke-width="5"/>
    ${text("SOLAR INSTALLATION  /  " + country.name, 170, 455, 45, "#000", 'font-weight="700" letter-spacing="2"')}
    ${text(country.headline[0], 152, 674, 165, "#000", 'font-weight="700" letter-spacing="-9"')}
    ${text(country.headline[1], 152, 865, 196, "#000", 'font-weight="700" letter-spacing="-10"')}
    ${img(photo, 160, 948, 2160, 1560, "jpeg")}
    <rect x="160" y="2347" width="2160" height="160" fill="#fff" opacity="0.88"/>
    ${text("LESS GRID POWER. MORE CONTROL.", 203, 2453, 66, "#000", 'font-weight="700" letter-spacing="-2"')}
    <line x1="170" y1="2570" x2="2310" y2="2570" stroke="#000" stroke-width="6"/>
    ${text("MAKE YOUR ROOF", 170, 2729, 100, "#000", 'font-weight="700" letter-spacing="-5"')}
    ${text("WORK FOR YOU.", 170, 2847, 100, "#000", 'font-weight="700" letter-spacing="-5"')}
    ${text("Scan for a free solar assessment", 170, 2960, 47, "#000")}
    ${text(country.url, 170, 3175, 51, "#000", 'font-weight="700"')}
    ${text("Illustrative imagery. Savings vary by system, use and tariff.", 170, 3320, 26, "#000")}
    <rect x="1768" y="2658" width="535" height="535" fill="#fff" stroke="#000" stroke-width="5"/>
    ${img(qr, 1788, 2678, 495, 495)}
  </svg>`;
}

async function save(name, svg) {
  const png = await sharp(Buffer.from(svg), { density: 300 })
    .resize(WIDTH, HEIGHT).flatten({ background: "#fff" })
    .png({ compressionLevel: 9 }).withMetadata({ density: 300 }).toBuffer();
  await writeFile(path.join(output, `${name}.svg`), svg);
  await writeFile(path.join(output, `${name}.png`), png);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const embedded = await pdf.embedPng(png);
  page.drawImage(embedded, { x: 0, y: 0, width: 595.28, height: 841.89 });
  await writeFile(path.join(output, `${name}.pdf`), await pdf.save());
  console.log(`${name}: A4 PDF + 2480x3508 300-DPI PNG + SVG`);
}

for (const country of countries) {
  const colorQr = await brandedQr(country.slug, false);
  const bwQr = await brandedQr(country.slug, true);
  await save(`${country.slug}-color-v2-a4`, colorPoster(country, await hero(country.slug, false), colorQr));
  await save(`${country.slug}-bw-v2-a4`, bwPoster(country, await hero(country.slug, true), bwQr));
}
