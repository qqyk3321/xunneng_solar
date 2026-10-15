import test from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { PNG } from "pngjs";
import sharp from "sharp";
import jsQR from "jsqr";
import { consultationQrAttachment, PREVIEW_QR_CONTENT_ID, PREVIEW_QR_HTML, qrDataUrl } from "../supabase/functions/_shared/consultation-qr";
import { consultationWhatsAppUrl } from "../supabase/functions/_shared/whatsapp";

export async function decodeQr(png: Buffer, width = 200) {
  const { data, info } = await sharp(png).resize(width, width).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
}

test("inline PNGs scan to the exact private quote URL at the email display size", async () => {
  for (const region of ["antigua", "dominica"]) {
    const url = `https://www.solortide.com/${region}/submission/${"aB_1-".repeat(8)}abc`;
    const attachment = await consultationQrAttachment(url, QRCode, PNG);
    assert.equal(attachment.content_type, "image/png");
    assert.equal(attachment.content_id, PREVIEW_QR_CONTENT_ID);
    assert.ok(PREVIEW_QR_HTML.includes(`src="cid:${attachment.content_id}"`));
    assert.ok(PREVIEW_QR_HTML.length < 2000, "Resend template variable size limit");
    assert.equal(await decodeQr(Buffer.from(attachment.content, "base64")), url);
    assert.deepEqual(await consultationQrAttachment(url, QRCode, PNG), attachment, "provider retries must have identical PNG bytes");
  }
});

test("WhatsApp QR preserves the reference and matches the clickable destination", async () => {
  for (const id of ["preview-test-AG", "preview-test-DM", "x".repeat(200)]) {
    const url = consultationWhatsAppUrl(id, "https://wa.me/12680000001");
    const png = Buffer.from((await qrDataUrl(url, QRCode, PNG)).split(",")[1], "base64");
    assert.equal(await decodeQr(png), url);
  }
});
