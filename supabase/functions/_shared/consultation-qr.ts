// Generated locally in Node/Deno. No customer preview link leaves the sender
// for image hosting or a third-party QR service.
import type QRCode from "qrcode";
import type { PNG } from "pngjs";
import { Buffer } from "node:buffer";
import { CONSULTATION_QR_LOGO_PNG } from "./consultation-qr-logo.ts";

type QrEncoder = Pick<typeof QRCode, "toDataURL">;
type PngCodec = Pick<typeof PNG, "sync">;

export const PREVIEW_QR_CONTENT_ID = "consultation-preview-qr";

// Resend templates have substitution but no conditionals. An optional, trusted
// HTML variable keeps old stored retry payloads free of missing CID images.
export const PREVIEW_QR_HTML = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px"><tr><td align="center"><img src="cid:${PREVIEW_QR_CONTENT_ID}" width="200" height="200" alt="Scan to view your preliminary quote on your phone" style="display:block;width:200px;height:200px;margin:0 auto;border:0;border-radius:24px" /></td></tr></table>`;

const BACKGROUND = [234, 243, 239] as const; // Sea salt green, #eaf3ef.
const TEAL = [0, 122, 135] as const; // Brand teal, #007a87.

// Coverage for an antialiased rounded rectangle. Keep all styling inside the
// PNG, so its shape survives email clients that ignore CSS border-radius.
function coverage(x: number, y: number, left: number, top: number, width: number, radius: number) {
  const dx = Math.max(left + radius - x, 0, x - (left + width - radius));
  const dy = Math.max(top + radius - y, 0, y - (top + width - radius));
  return Math.max(0, Math.min(1, radius + 0.5 - Math.hypot(dx, dy)));
}

function brandedPng(dataUrl: string, png: PngCodec) {
  const image = png.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  const size = image.width;
  const scale = 6;
  const margin = 4 * scale;
  const finderSize = 7 * scale;
  const finders = [[margin, margin], [size - margin - finderSize, margin], [margin, size - margin - finderSize]];
  for (const [left, top] of finders) {
    for (let y = top; y < top + finderSize; y++) for (let x = left; x < left + finderSize; x++) {
      const outer = coverage(x + .5, y + .5, left, top, finderSize, scale * 1.25);
      const inner = coverage(x + .5, y + .5, left + scale, top + scale, finderSize - scale * 2, scale * .7);
      const core = coverage(x + .5, y + .5, left + scale * 2, top + scale * 2, scale * 3, scale * .55);
      const ink = Math.max(outer - inner, core);
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) image.data[offset + c] = Math.round(BACKGROUND[c] * (1 - ink) + TEAL[c] * ink);
    }
  }

  // A small logo on a matching, rounded quiet plate; H correction preserves
  // scan reliability despite the deliberately obscured central data modules.
  const logo = png.sync.read(Buffer.from(CONSULTATION_QR_LOGO_PNG, "base64"));
  const logoSize = Math.floor(size * .16);
  const plateSize = logoSize + scale * 2;
  const plateStart = Math.floor((size - plateSize) / 2);
  for (let y = plateStart; y < plateStart + plateSize; y++) for (let x = plateStart; x < plateStart + plateSize; x++) {
    const alpha = coverage(x + .5, y + .5, plateStart, plateStart, plateSize, scale * 1.5);
    const offset = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) image.data[offset + c] = Math.round(image.data[offset + c] * (1 - alpha) + BACKGROUND[c] * alpha);
  }
  const start = Math.floor((size - logoSize) / 2);
  for (let y = 0; y < logoSize; y++) for (let x = 0; x < logoSize; x++) {
    const source = (Math.floor(y * logo.height / logoSize) * logo.width + Math.floor(x * logo.width / logoSize)) * 4;
    const target = ((start + y) * size + start + x) * 4;
    const alpha = logo.data[source + 3] / 255;
    for (let c = 0; c < 3; c++) image.data[target + c] = Math.round(image.data[target + c] * (1 - alpha) + logo.data[source + c] * alpha);
  }

  // Transparent outer corners reveal the surrounding email or page background.
  // Keep the rounding clear of the finder modules and their adjacent margin.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    image.data[(y * size + x) * 4 + 3] = Math.round(255 * coverage(x + .5, y + .5, 0, 0, size, Math.min(size * .12, margin * 2)));
  }
  return `data:image/png;base64,${png.sync.write(image).toString("base64")}`;
}

export async function qrDataUrl(url: string, encoder: QrEncoder, png: PngCodec): Promise<string> {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol) || url.length > 2048) {
    throw new Error("Invalid QR destination");
  }
  const dataUrl = await encoder.toDataURL(url, {
    errorCorrectionLevel: "H", margin: 4, scale: 6,
    color: { dark: "#123d42", light: "#eaf3ef" },
  });
  return brandedPng(dataUrl, png);
}

export async function consultationQrAttachment(previewUrl: string, encoder: QrEncoder, png: PngCodec) {
  const dataUrl = await qrDataUrl(previewUrl, encoder, png);
  return {
    filename: "preliminary-quote-qr.png",
    content_type: "image/png",
    content_id: PREVIEW_QR_CONTENT_ID,
    content: dataUrl.slice("data:image/png;base64,".length),
  };
}
