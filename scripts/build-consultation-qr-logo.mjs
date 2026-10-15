import fs from "node:fs/promises";
import sharp from "sharp";

// Rasterize the real brand asset at build time; Edge Functions need no native
// image library, asset request, or filesystem access when sending a message.
const png = await sharp(new URL("../app/icon.svg", import.meta.url).pathname)
  .resize(128, 128).png().toBuffer();
const output = `// Generated from app/icon.svg by scripts/build-consultation-qr-logo.mjs.\nexport const CONSULTATION_QR_LOGO_PNG = "${png.toString("base64")}";\n`;
const destination = new URL("../supabase/functions/_shared/consultation-qr-logo.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if (await fs.readFile(destination, "utf8") !== output) throw new Error("Consultation QR logo needs regenerating");
} else {
  await fs.writeFile(destination, output);
}
