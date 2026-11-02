import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

// A4 portrait, 300 DPI. The generated illustrations are deliberately separate
// from all copy and QR codes: text and scannable codes remain deterministic.
const WIDTH = 2480;
const HEIGHT = 3508;
const OUTPUT = path.resolve("design/flyers");
const COLORS = {
  teal: "#007a87",
  dark: "#082c36",
  ink: "#15383d",
  gold: "#ffb321",
  paper: "#ffffff",
  muted: "#506267",
};

const countries = [
  {
    slug: "antigua",
    label: "ANTIGUA & BARBUDA",
    headline: ["SUN IN.", "POWER ON."],
    bwHeadline: ["SUN IN.", "POWER ON."],
    description: [
      "A smarter energy plan for your home.",
      "Explore solar, storage and the next step for you.",
    ],
    url: "www.solortide.com/antigua",
  },
  {
    slug: "dominica",
    label: "DOMINICA",
    headline: ["POWER FOR", "ISLAND LIFE."],
    bwHeadline: ["POWER FOR", "ISLAND LIFE."],
    description: [
      "Plan for the way your island home lives.",
      "Explore solar, storage and the next step for you.",
    ],
    url: "www.solortide.com/dominica",
  },
];

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[char]);
}

function text(value, x, y, size, fill, options = "") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" ${options}>${escapeXml(value)}</text>`;
}

function brandMark(x, y, scale = 1, monochrome = false) {
  const background = monochrome ? "#ffffff" : COLORS.teal;
  const sun = monochrome ? "#000000" : "#ffd285";
  const wave = monochrome ? "#000000" : "#9de3de";
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <rect width="64" height="64" rx="16" fill="${background}" ${monochrome ? 'stroke="#000" stroke-width="2"' : ""}/>
    <circle cx="32" cy="25" r="12" fill="${sun}"/>
    <path d="M10 37C18 27 27 47 38 37S50 31 54 34V54H10Z" fill="${background}"/>
    <path d="M10 37C18 27 27 47 38 37S50 31 54 34" fill="none" stroke="${monochrome ? "#000000" : "#ffffff"}" stroke-width="4" stroke-linecap="round"/>
    <path d="M14 47C22 40 29 55 40 47S49 43 51 44" fill="none" stroke="${wave}" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

function rootSvg(contents) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${contents}</svg>`;
}

function qrImage(pngBytes, x, y, size) {
  return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/png;base64,${pngBytes.toString("base64")}"/>`;
}

function colorPoster(country, photo, qr) {
  const hero = `data:image/png;base64,${photo.toString("base64")}`;
  const header = `<rect width="${WIDTH}" height="1050" fill="${COLORS.dark}"/>
    ${brandMark(160, 154, 2.1)}
    ${text("SOL & TIDE", 330, 226, 77, COLORS.paper, 'font-weight="700" letter-spacing="1"')}
    ${text("ENERGY", 332, 283, 43, COLORS.gold, 'font-weight="700" letter-spacing="13"')}
    ${text(country.label, 168, 413, 45, "#b6e6e5", 'font-weight="700" letter-spacing="12"')}
    <rect x="166" y="455" width="118" height="13" fill="${COLORS.gold}"/>
    ${text(country.headline[0], 150, 687, 168, COLORS.paper, 'font-weight="700" letter-spacing="-8"')}
    ${text(country.headline[1], 150, 876, 156, COLORS.gold, 'font-weight="700" letter-spacing="-8"')}
    ${text("SOLAR + BATTERY SOLUTIONS FOR ISLAND HOMES", 170, 990, 39, "#c5e5e5", 'font-weight="700" letter-spacing="3"')}`;

  const landscape = `<defs><clipPath id="landscape-crop"><rect x="0" y="1030" width="2480" height="1400"/></clipPath></defs>
    <image x="0" y="-616" width="2480" height="3720" preserveAspectRatio="none" clip-path="url(#landscape-crop)" href="${hero}"/>
    <rect x="0" y="1030" width="2480" height="180" fill="${COLORS.dark}" opacity="0.12"/>`;

  const footer = `<rect x="0" y="2340" width="2480" height="1168" fill="${COLORS.paper}"/>
    <rect x="164" y="2450" width="120" height="15" fill="${COLORS.gold}"/>
    ${text("MADE FOR THE WAY YOU LIVE.", 164, 2580, 63, COLORS.ink, 'font-weight="700" letter-spacing="-2"')}
    ${text(country.description[0], 166, 2678, 45, COLORS.muted)}
    ${text(country.description[1], 166, 2740, 45, COLORS.muted)}
    <line x1="164" y1="2830" x2="2316" y2="2830" stroke="#bfcfd1" stroke-width="3"/>
    ${text("START WITH A FREE", 164, 2980, 74, COLORS.ink, 'font-weight="700" letter-spacing="-3"')}
    ${text("ASSESSMENT.", 164, 3078, 74, COLORS.teal, 'font-weight="700" letter-spacing="-3"')}
    ${text("Scan to explore your options", 166, 3195, 40, COLORS.muted)}
    ${text(country.url, 164, 3322, 49, COLORS.ink, 'font-weight="700"')}
    ${text("Illustrative imagery. System design and results depend on your home.", 164, 3435, 26, COLORS.muted)}
    <rect x="1792" y="2864" width="560" height="560" rx="28" fill="#fff" stroke="#bfd4d4" stroke-width="4"/>
    ${qrImage(qr, 1828, 2900, 488)}`;

  return rootSvg(header + landscape + footer);
}

function bwPoster(country, qr) {
  // Ink-efficient, strictly black-and-white composition: no photograph,
  // grayscale fills, gradients, or reversed white type on large solid blocks.
  const header = `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
    <rect x="120" y="120" width="2240" height="3268" fill="none" stroke="#000" stroke-width="7"/>
    ${brandMark(182, 196, 2.1, true)}
    ${text("SOL & TIDE ENERGY", 360, 292, 67, "#000", 'font-weight="700" letter-spacing="1"')}
    <line x1="182" y1="396" x2="2298" y2="396" stroke="#000" stroke-width="5"/>
    ${text("SOLAR + BATTERY  /  " + country.label, 184, 497, 45, "#000", 'font-weight="700" letter-spacing="3"')}`;

  const headline = `${text(country.bwHeadline[0], 163, 772, 172, "#000", 'font-weight="700" letter-spacing="-10"')}
    ${text(country.bwHeadline[1], 163, 975, 157, "#000", 'font-weight="700" letter-spacing="-9"')}
    <circle cx="1770" cy="1270" r="302" fill="none" stroke="#000" stroke-width="15"/>
    <path d="M1615 1179 C1710 1120 1802 1265 1928 1168 C2031 1085 2115 1169 2230 1147" fill="none" stroke="#000" stroke-width="22" stroke-linecap="round"/>
    <path d="M1425 1338 C1592 1246 1709 1450 1880 1348 C2041 1251 2111 1360 2278 1323" fill="none" stroke="#000" stroke-width="13" stroke-linecap="round"/>
    <path d="M1448 1474 C1598 1408 1723 1587 1891 1490 C2050 1397 2145 1513 2290 1476" fill="none" stroke="#000" stroke-width="10" stroke-linecap="round"/>
    <line x1="182" y1="1640" x2="2298" y2="1640" stroke="#000" stroke-width="5"/>`;

  const body = `${text("ENERGY THAT STARTS WITH YOU.", 183, 1774, 78, "#000", 'font-weight="700" letter-spacing="-3"')}
    ${text(country.description[0], 184, 1887, 51, "#000")}
    ${text(country.description[1], 184, 1960, 51, "#000")}
    <line x1="182" y1="2070" x2="2298" y2="2070" stroke="#000" stroke-width="5"/>
    ${text("01", 184, 2206, 67, "#000", 'font-weight="700"')}
    ${text("Explore solar + storage", 329, 2206, 51, "#000")}
    ${text("02", 184, 2322, 67, "#000", 'font-weight="700"')}
    ${text("Tell us about your home", 329, 2322, 51, "#000")}
    ${text("03", 184, 2438, 67, "#000", 'font-weight="700"')}
    ${text("Get a free initial assessment", 329, 2438, 51, "#000")}
    <line x1="182" y1="2530" x2="2298" y2="2530" stroke="#000" stroke-width="5"/>
    ${text("SCAN TO START", 184, 2760, 103, "#000", 'font-weight="700" letter-spacing="-4"')}
    ${text("YOUR ASSESSMENT", 184, 2870, 85, "#000", 'font-weight="700" letter-spacing="-4"')}
    <rect x="1733" y="2622" width="555" height="555" rx="12" fill="#fff" stroke="#000" stroke-width="5"/>
    ${qrImage(qr, 1764, 2653, 493)}
    ${text(country.url, 185, 3168, 53, "#000", 'font-weight="700"')}
    <line x1="182" y1="3220" x2="2298" y2="3220" stroke="#000" stroke-width="5"/>
    ${text("Sol & Tide Energy  /  " + country.label, 184, 3305, 34, "#000", 'font-weight="700"')}`;

  return rootSvg(header + headline + body);
}

async function saveArtwork(name, svg) {
  const pngPath = path.join(OUTPUT, `${name}.png`);
  const svgPath = path.join(OUTPUT, `${name}.svg`);
  const pdfPath = path.join(OUTPUT, `${name}.pdf`);
  const png = await sharp(Buffer.from(svg), { density: 300 })
    .resize(WIDTH, HEIGHT)
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .withMetadata({ density: 300 })
    .toBuffer();
  await writeFile(svgPath, svg);
  await writeFile(pngPath, png);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 exactly, in PDF points.
  const image = await pdf.embedPng(png);
  page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  await writeFile(pdfPath, await pdf.save());
  console.log(`${name}: ${WIDTH}x${HEIGHT} px / A4 PDF`);
}

for (const country of countries) {
  const [photo, qr] = await Promise.all([
    readFile(path.join(OUTPUT, `assets/${country.slug}-hero.png`)),
    readFile(path.join(OUTPUT, `assets/${country.slug}-qr.png`)),
  ]);
  await saveArtwork(`${country.slug}-color-a4`, colorPoster(country, photo, qr));
  await saveArtwork(`${country.slug}-bw-a4`, bwPoster(country, qr));
}
