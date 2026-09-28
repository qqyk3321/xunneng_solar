import fs from "node:fs/promises";
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";

// Read the same public contact setting used by the UI; never encode a help URL.
const settings = await fs.readFile(
  new URL("../lib/site-contact.ts", import.meta.url),
  "utf8",
);
const url = settings.match(/whatsappUrl: "(https:\/\/wa.me\/\d+)"/)?.[1];
if (!url) throw new Error("Missing WhatsApp contact URL");
const qr = await QRCode.toBuffer(url, {
  errorCorrectionLevel: "H",
  margin: 4,
  scale: 16,
});
const metadata = await sharp(qr).metadata();
const size = metadata.width;
const logoSize = Math.floor(size * 0.14);
const plateSize = logoSize + 16;
const logo = await sharp(new URL("../app/icon.svg", import.meta.url).pathname)
  .resize(logoSize, logoSize)
  .png()
  .toBuffer();
const plate = await sharp({
  create: {
    width: plateSize,
    height: plateSize,
    channels: 4,
    background: "#fff",
  },
})
  .composite([{ input: logo, gravity: "centre" }])
  .png()
  .toBuffer();
const branded = await sharp(qr)
  .composite([{ input: plate, gravity: "centre" }])
  .png()
  .toBuffer();
// Decode the finished logo-overlaid image, including its smallest UI size.
for (const width of [size, 240, 208, 180, 140, 112]) {
  const { data, info } = await sharp(branded)
    .resize(width, width)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  if (decoded?.data !== url) throw new Error("QR decode failed at " + width);
}
await fs.mkdir(new URL("../public/contact/", import.meta.url), {
  recursive: true,
});
await fs.writeFile(
  new URL("../public/contact/whatsapp-qr.png", import.meta.url),
  branded,
);
console.log("Verified branded QR at six sizes:", url, branded.length, "bytes");
