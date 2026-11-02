import "dotenv/config";

import { render } from "@react-email/render";
import { Resend } from "resend";

import { DEFAULT_WHATSAPP_BASE_URL } from "../../supabase/functions/_shared/whatsapp";
import ConsultationReceivedEmail from "../templates/consultation-received";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(resendApiKey);
const templateName =
  process.env.RESEND_TEMPLATE_NAME?.trim() || "solortide-consultation-received";
const brandName =
  process.env.CONSULTATION_BRAND_NAME?.trim() || "Sol & Tide Energy";
const html = await render(
  ConsultationReceivedEmail({
    brandName,
    submissionId: "{{{SUBMISSION_ID}}}",
    recipientName: "{{{RECIPIENT_NAME}}}",
    recipientEmail: "{{{RECIPIENT_EMAIL}}}",
    previewUrl: "{{{PREVIEW_URL}}}",
    previewQrHtml: "{{{PREVIEW_QR_HTML}}}",
    whatsappUrl: "{{{WHATSAPP_URL}}}",
    supportEmail: "{{{SUPPORT_EMAIL}}}",
    submittedAt: "{{{SUBMITTED_AT}}}",
  }),
);

const templatePayload = {
  name: templateName,
  subject: `Your preliminary quote is ready | ${brandName}`,
  html,
  variables: [
    { key: "PREVIEW_QR_HTML", type: "string" as const, fallbackValue: "" },
    {
      key: "WHATSAPP_URL", type: "string" as const,
      fallbackValue: `${DEFAULT_WHATSAPP_BASE_URL}?text=Hi%20Sol%20%26%20Tide%2C%20please%20help%20me%20with%20my%20preliminary%20quote.`,
    },
    // Keep legacy caller variables accepted; neither is rendered in the email.
    { key: "QUOTE_XCD", type: "string" as const, fallbackValue: "" },
    { key: "SUBMISSION_ID", type: "string" as const, fallbackValue: "Please reply to this email for your submission ID." },
    {
      key: "RECIPIENT_NAME",
      type: "string" as const,
      fallbackValue: "there",
    },
    {
      key: "RECIPIENT_EMAIL",
      type: "string" as const,
      fallbackValue: "customer@example.com",
    },
    {
      key: "PREVIEW_URL",
      type: "string" as const,
      fallbackValue: "https://www.solortide.com/antigua",
    },
    {
      key: "SUPPORT_EMAIL",
      type: "string" as const,
      fallbackValue: "ag-support@solortide.com",
    },
    {
      key: "SUBMITTED_AT",
      type: "string" as const,
      fallbackValue: "Please contact our team for the submission time.",
    },
    {
      key: "REPLY_DEADLINE",
      type: "string" as const,
      fallbackValue: "",
    },
  ],
};

const templates = await resend.templates.list();

if (templates.error) {
  throw new Error(templates.error.message);
}

const existingTemplate = templates.data?.data.find(
  (template) => process.env.RESEND_TEMPLATE_ID
    ? template.id === process.env.RESEND_TEMPLATE_ID
    : template.name === templateName,
);
if (process.env.RESEND_TEMPLATE_ID && !existingTemplate) {
  throw new Error("Configured template ID not found; refusing to create a different template");
}
const saved = existingTemplate
  ? await resend.templates.update(existingTemplate.id, templatePayload)
  : await resend.templates.create(templatePayload);

if (saved.error || !saved.data?.id) {
  throw new Error(saved.error?.message || "Failed to save Resend template");
}

const published = await resend.templates.publish(saved.data.id);

if (published.error) {
  throw new Error(published.error.message);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      action: existingTemplate ? "updated" : "created",
      templateId: saved.data.id,
      publishedTemplateId: published.data?.id ?? null,
      name: templateName,
    },
    null,
    2,
  ),
);
