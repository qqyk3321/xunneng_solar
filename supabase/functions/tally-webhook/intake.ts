// No legacy field heuristics: map the new Tally keys explicitly.
export const FIELD_NAMES = [
  "installation_country",
  "name",
  "email",
  "phone",
  "parish",
  "town",
  "street",
  "building",
  "directions",
] as const;
type FieldName = (typeof FIELD_NAMES)[number];
type Obj = Record<string, unknown>;
type Config = { formId: string; fields: Record<FieldName, string> };
export type SubmissionRow = {
  form_id: string;
  submission_id: string;
  event_id: string | null;
  submitted_at: string;
  country_code: "AG" | "DM";
  name: string;
  email: string;
  phone: string;
  address: {
    parish: string;
    town: string;
    street: string;
    building: string | null;
    directions: string | null;
  };
  payload: Obj;
};
type Env = (name: string) => string | undefined;
type Save = (row: SubmissionRow) => Promise<{ duplicate: boolean }>;
const object = (value: unknown): Obj | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Obj)
    : null;
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const reply = (status: number, error: string) =>
  Response.json({ error }, { status });
export function parseConfig(raw: string | undefined): Config | null {
  try {
    const config = object(JSON.parse(raw ?? ""));
    const fields = object(config?.fields);
    if (
      !config ||
      !fields ||
      typeof config.formId !== "string" ||
      !/^[A-Za-z0-9]+$/.test(config.formId)
    )
      return null;
    const keys = FIELD_NAMES.map((name) => fields[name]);
    if (
      keys.some((key) => typeof key !== "string" || !key.trim()) ||
      new Set(keys).size !== keys.length
    )
      return null;
    return { formId: config.formId, fields: fields as Config["fields"] };
  } catch {
    return null;
  }
}
function extract(payload: Obj, config: Config): SubmissionRow {
  const data = object(payload.data);
  if (
    !data ||
    payload.eventType !== "FORM_RESPONSE" ||
    data.formId !== config.formId
  )
    throw new Error("Unexpected event or form");
  const submissionId = text(data.submissionId);
  const createdAt = text(data.createdAt);
  if (
    !submissionId ||
    submissionId.length > 200 ||
    !createdAt ||
    !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(createdAt) ||
    !Number.isFinite(Date.parse(createdAt))
  )
    throw new Error("Invalid submission metadata");
  if (!Array.isArray(data.fields)) throw new Error("Missing fields");
  const fields = new Map<string, Obj>();
  for (const item of data.fields) {
    const field = object(item);
    const key = text(field?.key);
    if (!field || !key || fields.has(key))
      throw new Error("Invalid or duplicate field key");
    fields.set(key, field);
  }
  function read(name: FieldName, max: number, required = true): string | null {
    const field = fields.get(config.fields[name]);
    if (!field) {
      if (!required) return null;
      throw new Error("Missing field: " + name);
    }
    if (
      field.value !== null &&
      field.value !== undefined &&
      typeof field.value !== "string"
    )
      throw new Error("Expected text: " + name);
    const value = text(field.value);
    if ((required && !value) || (value && value.length > max))
      throw new Error("Invalid field: " + name);
    return value;
  }
  const country = read("installation_country", 2);
  if (country !== "AG" && country !== "DM")
    throw new Error("Invalid installation_country");
  const name = read("name", 200)!;
  const email = read("email", 320)!;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Invalid email");
  const phone = read("phone", 40)!;
  const digits = phone.replace(/\D/g, "");
  if (!/^\+[\d ()-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
    throw new Error("Phone must include an international country code");
  return {
    form_id: config.formId,
    submission_id: submissionId,
    event_id: text(payload.eventId),
    submitted_at: new Date(createdAt).toISOString(),
    country_code: country,
    name,
    email,
    phone,
    address: {
      parish: read("parish", 200)!,
      town: read("town", 200)!,
      street: read("street", 500)!,
      building: read("building", 300, false),
      directions: read("directions", 2000, false),
    },
    payload,
  };
}
export async function receiveSubmission(
  req: Request,
  env: Env,
  save: Save,
): Promise<Response> {
  if (req.method !== "POST") return reply(405, "Method not allowed");
  const secret = env("TALLY_SIGNING_SECRET");
  const config = parseConfig(env("TALLY_INTAKE_CONFIG"));
  if (env("TALLY_INTAKE_ENABLED") !== "true" || !secret || !config)
    return reply(503, "Intake is awaiting form configuration");
  const signatureHeader = req.headers.get("tally-signature");
  if (!signatureHeader || signatureHeader.length !== 44)
    return reply(401, "Invalid signature");
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return reply(415, "JSON required");
  const reader = req.body?.getReader();
  if (!reader) return reply(400, "Empty body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        return reply(413, "Payload too large");
      }
      chunks.push(value);
    }
  } catch {
    return reply(400, "Invalid body");
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let payload: Obj | null;
  try {
    payload = object(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } catch {
    return reply(400, "Invalid JSON");
  }
  // Tally's documented signature: base64 HMAC-SHA256 of JSON.stringify(payload).
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  let signature: Uint8Array;
  try {
    signature = Uint8Array.from(atob(signatureHeader), (c) => c.charCodeAt(0));
  } catch {
    return reply(401, "Invalid signature");
  }
  if (
    !(await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(signature),
      new TextEncoder().encode(JSON.stringify(payload)),
    ))
  )
    return reply(401, "Invalid signature");
  if (!payload) return reply(400, "Invalid event");
  let row: SubmissionRow;
  try {
    row = extract(payload, config);
  } catch (error) {
    return reply(
      400,
      error instanceof Error ? error.message : "Invalid submission",
    );
  }
  try {
    const result = await save(row);
    return Response.json({ ok: true, duplicate: result.duplicate });
  } catch {
    console.error(
      JSON.stringify({ event: "tally_intake_failed", stage: "storage" }),
    );
    return reply(503, "Unable to save submission; please retry");
  }
}
