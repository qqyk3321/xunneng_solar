import "dotenv/config";

import express, { type Request, type Response } from "express";
import { Resend } from "resend";
import QRCode from "qrcode";
import { PNG } from "pngjs";

import { consultationWhatsAppUrl } from "../../supabase/functions/_shared/whatsapp";
import { consultationQrAttachment, PREVIEW_QR_HTML } from "../../supabase/functions/_shared/consultation-qr";
import ConsultationReceivedEmail from "../templates/consultation-received";
import {
  type ConsultationSendPayload,
  formatRegionalTimestamp,
  parseOptionalString,
  parseIsoDate,
  splitEmails,
} from "./types";

const port = Number(process.env.PORT ?? "3200");
const resendApiKey = process.env.RESEND_API_KEY;
const resendServiceSecret = process.env.RESEND_SERVICE_SECRET;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const consultationInternalRecipients = splitEmails(
  process.env.CONSULTATION_INTERNAL_TO,
);
const consultationBrandName =
  process.env.CONSULTATION_BRAND_NAME?.trim() || "Sol & Tide Energy";

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

if (!resendFromEmail) {
  throw new Error("Missing RESEND_FROM_EMAIL");
}

const resend = new Resend(resendApiKey);
const app = express();

app.use(express.json({ limit: "1mb" }));

function unauthorized(response: Response) {
  return response.status(401).json({ error: "Unauthorized" });
}

function buildPayload(body: unknown): ConsultationSendPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const source = body as Record<string, unknown>;
  const email = parseOptionalString(source.email);
  const submissionId = parseOptionalString(source.submissionId);
  const submittedAt = parseOptionalString(source.submittedAt);
  const replyDeadline = parseOptionalString(source.replyDeadline);
  const supportEmail = parseOptionalString(source.supportEmail);

  if (
    !email || !submissionId || !/^[A-Za-z0-9_-]{1,200}$/.test(submissionId) ||
    !submittedAt ||
    !replyDeadline ||
    !supportEmail ||
    !parseIsoDate(submittedAt) ||
    !parseIsoDate(replyDeadline)
  ) {
    return null;
  }

  return {
    countryCode: source.countryCode === "DM" || supportEmail === "dm-support@solortide.com" ? "DM" : "AG",
    email,
    submissionId,
    previewUrl: parseOptionalString(source.previewUrl),
    submittedAt,
    replyDeadline,
    supportEmail,
  };
}

app.get("/health", (_request: Request, response: Response) => {
  response.json({ ok: true });
});

app.post("/send/consultation", async (request: Request, response: Response) => {
  if (
    resendServiceSecret &&
    request.header("x-resend-service-secret") !== resendServiceSecret
  ) {
    return unauthorized(response);
  }

  const payload = buildPayload(request.body);
  if (!payload) {
    return response.status(400).json({ error: "Invalid consultation payload" });
  }

  try {
    const submittedDate = parseIsoDate(payload.submittedAt)!;
    const replyDeadline = parseIsoDate(payload.replyDeadline)!;
    const qr = payload.previewUrl ? await consultationQrAttachment(payload.previewUrl, QRCode, PNG) : null;

    const customerResult = await resend.emails.send({
      from: resendFromEmail,
      to: payload.email,
      subject: `${consultationBrandName} has received your consultation`,
      replyTo: [payload.supportEmail],
      attachments: qr ? [{ filename: qr.filename, content: qr.content, contentType: qr.content_type, contentId: qr.content_id }] : undefined,
      react: ConsultationReceivedEmail({
        brandName: consultationBrandName,
        submissionId: payload.submissionId,
        whatsappUrl: consultationWhatsAppUrl(payload.submissionId, process.env.WHATSAPP_BASE_URL || undefined),
        previewUrl: payload.previewUrl ?? undefined,
        previewQrHtml: qr ? PREVIEW_QR_HTML : undefined,
        recipientEmail: payload.email,
        supportEmail: payload.supportEmail,
        submittedAt: formatRegionalTimestamp(
          submittedDate,
          payload.countryCode,
        ),
      }),
    });

    if (customerResult.error) {
      return response.status(502).json({ error: customerResult.error.message });
    }

    let internalEmailId: string | null = null;

    if (consultationInternalRecipients.length > 0) {
      const internalResult = await resend.emails.send({
        from: resendFromEmail,
        to: consultationInternalRecipients,
        subject: `New consultation: ${payload.email}`,
        replyTo: [payload.supportEmail],
        text: [
          "A new consultation has been received.",
          `Customer email: ${payload.email}`,
          `Submission ID: ${payload.submissionId}`,
          payload.previewUrl ? `Submission URL: ${payload.previewUrl}` : null,
          `Submitted at: ${formatRegionalTimestamp(submittedDate, payload.countryCode)}`,
          `Expected reply by: ${formatRegionalTimestamp(replyDeadline, payload.countryCode)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      if (internalResult.error) {
        return response.status(502).json({
          error: internalResult.error.message,
          customerEmailId: customerResult.data?.id ?? null,
        });
      }

      internalEmailId = internalResult.data?.id ?? null;
    }

    return response.json({
      ok: true,
      customerEmailId: customerResult.data?.id ?? null,
      internalEmailId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Resend error";
    return response.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`xunneng email service listening on http://0.0.0.0:${port}`);
});
