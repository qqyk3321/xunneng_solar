import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@react-email/render";
import { consultationWhatsAppUrl } from "../../supabase/functions/_shared/whatsapp";
import ConsultationReceivedEmail from "../templates/consultation-received";
import { PREVIEW_QR_HTML, PREVIEW_QR_CONTENT_ID } from "../../supabase/functions/_shared/consultation-qr";

test("rendered email preserves the submission reference and time without a reply deadline", async () => {
  for (const region of ["ag", "dm"]) {
    const id = `TEST-${region}-123`;
    const html = await render(ConsultationReceivedEmail({
      submissionId: id,
      whatsappUrl: consultationWhatsAppUrl(id),
      recipientName: "Test customer",
      recipientEmail: "test@example.com",
      previewUrl: "https://www.solortide.com/antigua/submission/test-only",
      supportEmail: `${region}-support@solortide.com`,
      submittedAt: "09/18/2026, 10:00:00 AST",
    }));
    assert.ok(html.includes(id));
    assert.ok(html.indexOf("Submission ID</p>") < html.lastIndexOf(id));
    assert.ok(html.lastIndexOf(id) < html.indexOf("Submitted at"));
    assert.ok(!/Expected reply|48 hours|patience/i.test(html));
    assert.ok(html.includes(`${region}-support@solortide.com`));
    assert.ok(!html.includes("{{{"));
  }
});

test("email links to the preliminary quote without displaying a price or response promise", async () => {
  const previewUrl = "https://www.solortide.com/dominica/submission/test-only";
  const html = await render(ConsultationReceivedEmail({ previewUrl }));
  assert.ok(html.includes("Our team has prepared a rough quote based on your submission."));
  assert.ok(html.includes("View your preliminary quote"));
  assert.ok(html.includes(`href="${previewUrl}"`));
  assert.ok(!/Estimated price|EC\$|QUOTE_XCD|REPLY_DEADLINE|48 hours|Expected reply|expect to reply/i.test(html));
  assert.ok(!/inverter|battery|markup|compensation|kWh|USD/i.test(html));
});


test("WhatsApp button uses the supplied URL unchanged and leaves the number out of the template", async () => {
  const whatsappUrl = consultationWhatsAppUrl("TEST-DM_42", "https://wa.me/12680000001");
  const html = await render(ConsultationReceivedEmail({ whatsappUrl }));
  assert.ok(html.includes(`href="${whatsappUrl}"`));
  assert.ok(html.includes("Chat on WhatsApp"));
  assert.ok(html.includes("#128C7E"));
  assert.ok(!html.includes("8617605886812"));
  const managed = await render(ConsultationReceivedEmail({ whatsappUrl: "{{{WHATSAPP_URL}}}" }));
  assert.ok(managed.includes('href="{{{WHATSAPP_URL}}}"'));
  assert.ok(!managed.includes("wa.me/"));
});

test("email embeds an optional CID QR while preserving both clickable links", async () => {
  const previewUrl = "https://www.solortide.com/antigua/submission/test-only";
  const whatsappUrl = consultationWhatsAppUrl("QR-test-123");
  const html = await render(ConsultationReceivedEmail({ previewUrl, whatsappUrl, previewQrHtml: PREVIEW_QR_HTML }));
  assert.ok(html.includes(`src="cid:${PREVIEW_QR_CONTENT_ID}"`));
  assert.ok(!html.includes(">Scan to view on your phone<"));
  assert.ok(html.includes(`href="${previewUrl}"`));
  assert.ok(html.includes(`href="${whatsappUrl}"`));
  const legacy = await render(ConsultationReceivedEmail({ previewUrl, previewQrHtml: "" }));
  assert.ok(!legacy.includes("cid:"), "old retry payloads must not display a missing attachment");
  const managed = await render(ConsultationReceivedEmail({ previewQrHtml: "{{{PREVIEW_QR_HTML}}}" }));
  assert.ok(managed.includes("{{{PREVIEW_QR_HTML}}}"), "hosted template substitutes a trusted HTML fragment");
});
