import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

const FORM_ID = "QKQpNX";
const TALLY_ID_PATTERN = /^[A-Za-z0-9]{7}$/;

function formatUtcTimestamp(date: Date, timezoneLabel: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date) + ` ${timezoneLabel}`
  );
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function looksLikeEmail(value: unknown): string | null {
  const text = stringValue(value);
  if (!text) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

function getPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const part of path) {
    const object = asObject(current);
    if (!object) return undefined;
    current = object[part];
  }
  return current;
}

function findEmailInFields(fields: unknown): string | null {
  if (!Array.isArray(fields)) return null;

  for (const field of fields) {
    const object = asObject(field);
    if (!object) continue;

    const label = stringValue(object.label ?? object.title ?? object.question)?.toLowerCase() ?? "";
    const key = stringValue(object.key ?? object.name ?? object.id)?.toLowerCase() ?? "";
    const value = object.value ?? object.answer ?? object.response;

    if (label.includes("email") || label.includes("邮箱") || key.includes("email")) {
      const email = looksLikeEmail(value);
      if (email) return email;
    }
  }

  for (const field of fields) {
    const object = asObject(field);
    if (!object) continue;
    const email = looksLikeEmail(object.value ?? object.answer ?? object.response);
    if (email) return email;
  }

  return null;
}

function findEmail(payload: unknown): string | null {
  const directPaths = [
    ["email"],
    ["data", "email"],
    ["respondent", "email"],
    ["data", "respondent", "email"],
    ["fields", "email"],
    ["data", "fields", "email"],
  ];

  for (const path of directPaths) {
    const email = looksLikeEmail(getPath(payload, path));
    if (email) return email;
  }

  return (
    findEmailInFields(getPath(payload, ["data", "fields"])) ??
    findEmailInFields(getPath(payload, ["fields"])) ??
    findEmailInFields(getPath(payload, ["answers"])) ??
    findEmailInFields(getPath(payload, ["data", "answers"]))
  );
}

function findString(payload: unknown, paths: string[][]): string | null {
  for (const path of paths) {
    const value = stringValue(getPath(payload, path));
    if (value) return value;
  }
  return null;
}

function findFieldValue(payload: unknown, label: string): string | null {
  const fields = getPath(payload, ["data", "fields"]);
  if (!Array.isArray(fields)) return null;

  for (const field of fields) {
    const object = asObject(field);
    if (!object) continue;

    if (stringValue(object.label) === label) {
      return stringValue(object.value);
    }
  }

  return null;
}

function parseJsonValue(value: string | null): JsonObject | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return asObject(parsed);
  } catch {
    return null;
  }
}

function buildConsultationPreviewUrl(args: {
  submissionId: string | null;
  responseId: string | null;
  respondentId: string | null;
}): string | null {
  const baseUrl = Deno.env.get("CONSULTATION_PREVIEW_BASE_URL")?.trim();
  const ids = [args.submissionId, args.responseId, args.respondentId];

  if (!baseUrl || !ids.every((id) => id && TALLY_ID_PATTERN.test(id))) {
    return null;
  }

  try {
    const previewUrl = new URL("/submission-preview-test", baseUrl);
    previewUrl.searchParams.set("id", ids.join(""));
    return previewUrl.toString();
  } catch {
    return null;
  }
}

async function sendResendTemplateEmail(args: {
  apiKey: string;
  to: string;
  from: string;
  templateId: string;
  previewUrl: string | null;
  replyTo?: string | null;
  subject: string;
  submittedAt: string;
  replyDeadline: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      ...(args.replyTo ? { reply_to: [args.replyTo] } : {}),
      template: {
        id: args.templateId,
        variables: {
          RECIPIENT_EMAIL: args.to,
          PREVIEW_URL: args.previewUrl ?? "",
          SUBMITTED_AT: args.submittedAt,
          REPLY_DEADLINE: args.replyDeadline,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Resend send failed");
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const webhookSecret = Deno.env.get("TALLY_WEBHOOK_SECRET");
  const requestSecret = new URL(req.url).searchParams.get("secret");
  if (webhookSecret && requestSecret !== webhookSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = findEmail(payload);
  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const formId =
    findString(payload, [["formId"], ["form_id"], ["data", "formId"], ["data", "form_id"]]) ??
    FORM_ID;
  const submissionId = findString(payload, [
    ["submissionId"],
    ["submission_id"],
    ["responseId"],
    ["response_id"],
    ["data", "submissionId"],
    ["data", "submission_id"],
    ["data", "responseId"],
    ["data", "response_id"],
  ]);
  const responseId = findString(payload, [
    ["responseId"],
    ["response_id"],
    ["data", "responseId"],
    ["data", "response_id"],
  ]);
  const respondentId = findString(payload, [
    ["respondentId"],
    ["respondent_id"],
    ["data", "respondentId"],
    ["data", "respondent_id"],
  ]);
  const submissionPdfUrl = findString(payload, [
    ["submissionPdfUrl"],
    ["submission_pdf_url"],
    ["data", "submissionPdfUrl"],
    ["data", "submission_pdf_url"],
  ]);
  const submissionPreviewUrl = findString(payload, [
    ["submissionPreviewUrl"],
    ["submission_preview_url"],
    ["data", "submissionPreviewUrl"],
    ["data", "submission_preview_url"],
  ]);
  const locationJson = parseJsonValue(findFieldValue(payload, "location_json"));
  const consultationPreviewUrl = buildConsultationPreviewUrl({
    submissionId,
    responseId,
    respondentId,
  });

  if (!submissionPreviewUrl || !consultationPreviewUrl) {
    return Response.json(
      {
        error: "Cannot create consultation preview URL",
        detail: "Check Tally preview metadata, submission identifiers, and CONSULTATION_PREVIEW_BASE_URL",
      },
      { status: 500 },
    );
  }

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    (secretKeys ? JSON.parse(secretKeys).default : undefined);

  if (!supabaseKey) {
    return Response.json({ error: "Missing Supabase secret key" }, { status: 500 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, supabaseKey);

  const { data, error } = await supabase
    .from("tally_form_submissions")
    .insert({
      form_id: formId,
      submission_id: submissionId,
      response_id: responseId,
      respondent_id: respondentId,
      submission_pdf_url: submissionPdfUrl,
      submission_preview_url: submissionPreviewUrl,
      location_json: locationJson,
      email,
      payload,
    })
    .select("id, received_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const submittedAt =
    typeof data.received_at === "string" ? data.received_at : new Date().toISOString();
  const replyWindowHours = Number(Deno.env.get("CONSULTATION_REPLY_WINDOW_HOURS") ?? "48");
  const timezoneLabel = Deno.env.get("CONSULTATION_TIMEZONE_LABEL")?.trim() || "UST";
  const submittedDate = new Date(submittedAt);
  const replyDeadline = new Date(
    submittedDate.getTime() + (Number.isFinite(replyWindowHours) ? replyWindowHours : 48) * 60 * 60 * 1000,
  );
  const submittedAtText = formatUtcTimestamp(submittedDate, timezoneLabel);
  const replyDeadlineText = formatUtcTimestamp(replyDeadline, timezoneLabel);
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendTemplateId = Deno.env.get("RESEND_TEMPLATE_ID");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const resendReplyTo = Deno.env.get("CONSULTATION_SUPPORT_EMAIL");
  const resendSubject = Deno.env.get("RESEND_EMAIL_SUBJECT") ?? "We received your consultation request";

  if (resendApiKey && resendTemplateId && resendFromEmail) {
    try {
      await sendResendTemplateEmail({
        apiKey: resendApiKey,
        to: email,
        from: resendFromEmail,
        templateId: resendTemplateId,
        previewUrl: consultationPreviewUrl,
        replyTo: resendReplyTo,
        subject: resendSubject,
        submittedAt: submittedAtText,
        replyDeadline: replyDeadlineText,
      });
    } catch (error) {
      return Response.json(
        {
          error: "Resend send failed",
          detail: error instanceof Error ? error.message : "Unknown Resend error",
        },
        { status: 502 },
      );
    }
  } else {
    const resendServiceUrl = Deno.env.get("RESEND_SERVICE_URL");
    const resendServiceSecret = Deno.env.get("RESEND_SERVICE_SECRET");

    if (resendServiceUrl) {
      const response = await fetch(resendServiceUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(resendServiceSecret ? { "x-resend-service-secret": resendServiceSecret } : {}),
        },
        body: JSON.stringify({
          email,
          previewUrl: consultationPreviewUrl,
          submittedAt,
          replyDeadline: replyDeadline.toISOString(),
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        return Response.json(
          {
            error: "Resend service failed",
            detail: responseText || response.statusText,
          },
          { status: 502 },
        );
      }
    }
  }

  return Response.json({ ok: true, id: data.id });
});
