import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { receiveSubmission, type SubmissionRow } from "./intake.ts";

type Environment = (name: string) => string | undefined;
type StoredSubmission = { id: number; received_at: string };
type DatabaseClient = ReturnType<typeof createClient>;

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function createPreviewUrl(args: {
  client: DatabaseClient;
  row: SubmissionRow;
  submission: StoredSubmission;
  serviceKey: string;
  siteUrl: string;
}) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(args.serviceKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`consultation-preview/${args.submission.id}`),
    ),
  );
  const token = base64Url(signature);
  const { error } = await args.client
    .from("consultation_preview_tokens")
    .upsert(
      {
        tally_submission_row_id: args.submission.id,
        token_hash: await hash(token),
        expires_at: new Date(
          new Date(args.receivedAt).getTime() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      { onConflict: "tally_submission_row_id" },
    );
  if (error) throw new Error("Preview token storage failed");
  const region = args.row.country_code === "AG" ? "antigua" : "dominica";
  return `${args.siteUrl.replace(/\/$/, "")}/${region}/submission/${token}`;
}

function formatRegionalTimestamp(
  date: Date,
  countryCode: SubmissionRow["country_code"],
): string {
  const timezone =
    countryCode === "AG" ? "America/Antigua" : "America/Dominica";
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date) + " AST"
  );
}

function regionalSupportEmail(
  env: Environment,
  countryCode: SubmissionRow["country_code"],
): string {
  const name =
    countryCode === "AG" ? "ANTIGUA_SUPPORT_EMAIL" : "DOMINICA_SUPPORT_EMAIL";
  const email = env(name)?.trim();
  if (!email) throw new Error(`Missing ${name}`);
  return email;
}

async function sendConfirmationEmail(args: {
  client: DatabaseClient;
  env: Environment;
  row: SubmissionRow;
  submission: StoredSubmission;
  receivedAt: string;
  previewUrl: string;
}) {
  const apiKey = args.env("RESEND_API_KEY");
  const templateId = args.env("RESEND_TEMPLATE_ID");
  const from = args.env("RESEND_FROM_EMAIL");
  if (!apiKey || !templateId || !from)
    throw new Error("Resend is not configured");

  const replyWindowHours = Number(
    args.env("CONSULTATION_REPLY_WINDOW_HOURS") ?? "48",
  );
  const submittedAt = new Date(args.receivedAt);
  const replyDeadline = new Date(
    submittedAt.getTime() +
      (Number.isFinite(replyWindowHours) ? replyWindowHours : 48) *
        60 *
        60 *
        1000,
  );
  const supportEmail = regionalSupportEmail(args.env, args.row.country_code);
  const idempotencyKey = `consultation-confirmation/${args.row.submission_id}`;
  const { data: audit, error: auditError } = await args.client
    .from("consultation_email_audit")
    .insert({
      tally_submission_row_id: args.submission.id,
      recipient_email: args.row.email,
      country_code: args.row.country_code,
      support_email: supportEmail,
      resend_template_id: templateId,
      resend_idempotency_key: idempotencyKey,
      status: "pending",
    })
    .select("id")
    .single();
  if (auditError || !audit) throw new Error("Email audit logging failed");

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [args.row.email],
        reply_to: [supportEmail],
        subject: "Sol & Tide Energy has received your consultation",
        template: {
          id: templateId,
          variables: {
            RECIPIENT_EMAIL: args.row.email,
            PREVIEW_URL: args.previewUrl,
            SUPPORT_EMAIL: supportEmail,
            SUBMITTED_AT: formatRegionalTimestamp(
              submittedAt,
              args.row.country_code,
            ),
            REPLY_DEADLINE: formatRegionalTimestamp(
              replyDeadline,
              args.row.country_code,
            ),
          },
        },
      }),
    });
  } catch (error) {
    await args.client
      .from("consultation_email_audit")
      .update({
        status: "failed",
        error_message:
          error instanceof Error
            ? error.message.slice(0, 2000)
            : "Network request failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", audit.id);
    throw error;
  }

  const responseText = await response.text();
  let resendEmailId: string | null = null;
  try {
    const body = JSON.parse(responseText) as { id?: unknown };
    resendEmailId = typeof body.id === "string" ? body.id : null;
  } catch {
    // Error responses are not guaranteed to be JSON.
  }
  const { error: updateError } = await args.client
    .from("consultation_email_audit")
    .update(
      response.ok
        ? {
            status: "accepted",
            resend_email_id: resendEmailId,
            resend_http_status: response.status,
            completed_at: new Date().toISOString(),
          }
        : {
            status: "failed",
            resend_http_status: response.status,
            error_message: responseText.slice(0, 2000),
            completed_at: new Date().toISOString(),
          },
    )
    .eq("id", audit.id);
  if (updateError) throw new Error("Email audit update failed");
  if (!response.ok) throw new Error(responseText || "Resend send failed");
}

Deno.serve((req: Request) =>
  receiveSubmission(
    req,
    (name) => Deno.env.get(name),
    async (row: SubmissionRow) => {
      const url = Deno.env.get("SUPABASE_URL"),
        key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) throw new Error("Storage is not configured");
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(7000) }),
        },
      });
      const { data, error } = await client
        .from("tally_form_submissions")
        .insert(row)
        .select("id, received_at")
        .single();
      if (!error && data?.id && data.received_at) {
        const previewUrl = await createPreviewUrl({
          client,
          row,
          submission: data,
          receivedAt: data.received_at,
          serviceKey: key,
          siteUrl: Deno.env.get("SITE_URL") ?? "https://www.solortide.com",
        });
        await sendConfirmationEmail({
          client,
          env: (name) => Deno.env.get(name),
          row,
          submission: data,
          receivedAt: data.received_at,
          previewUrl,
        });
        return { duplicate: false };
      }
      if (!error)
        throw new Error("Submission storage did not return received_at");
      if (error.code === "23505") {
        const existing = await client
          .from("tally_form_submissions")
          .select("id, received_at")
          .eq("form_id", row.form_id)
          .eq("submission_id", row.submission_id)
          .maybeSingle();
        if (!existing.error && existing.data?.id && existing.data.received_at) {
          const previewUrl = await createPreviewUrl({
            client,
            row,
            submission: existing.data,
            receivedAt: existing.data.received_at,
            serviceKey: key,
            siteUrl: Deno.env.get("SITE_URL") ?? "https://www.solortide.com",
          });
          await sendConfirmationEmail({
            client,
            env: (name) => Deno.env.get(name),
            row,
            submission: existing.data,
            receivedAt: existing.data.received_at,
            previewUrl,
          });
          return { duplicate: true };
        }
      }
      throw new Error("Submission storage failed");
    },
  ),
);
