import { createHash } from "node:crypto";
import { submissionSchema } from "./schema";
import type { ConsultationInput, Receipt } from "@solortide/consultation-core";
export class SubmissionError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
export function createSubmissionHandler(deps: {
  enabled: () => boolean; origin: (request: Request) => boolean;
  limit: (request: Request) => Promise<void>;
  save: (requestId: string, input: ConsultationInput, digest: string) => Promise<Receipt>;
}) {
  return async (request: Request) => {
    if (!deps.enabled()) return json({ error: "Unavailable" }, 404);
    if (!deps.origin(request)) return json({ error: "Please submit from this website." }, 403);
    try {
      await deps.limit(request);
      if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Invalid submission format." }, 415);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "Missing answers." }, 400);
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 20_000) { await reader.cancel(); throw new SubmissionError(413, "Your answers are too long."); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      let raw;
      try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return json({ error: "Invalid submission." }, 400); }
      const parsed = submissionSchema.safeParse(raw);
      if (!parsed.success) return json({ error: "Please check your answers.", fields: Object.fromEntries(parsed.error.issues.map(issue => [issue.path.filter(p => p !== "input").join("."), issue.message])) }, 422);
      const { requestId, input } = parsed.data;
      const digest = createHash("sha256").update(JSON.stringify(input)).digest("hex");
      const { id, reference, submittedAt } = await deps.save(requestId, input, digest);
      // Viewing/editing credentials are delivered by email, never by submission.
      return json({ receipt: { id, reference, submittedAt } });
    } catch (error) {
      const status = error instanceof SubmissionError ? error.status : typeof (error as { status?: unknown })?.status === "number" && [429, 503].includes((error as { status: number }).status) ? (error as { status: number }).status : 503;
      return json({ error: error instanceof SubmissionError ? error.message : status === 429 ? "Please wait a moment, then retry the same submission." : "We could not confirm the result. Your answers are saved; retry to check this submission." }, status);
    }
  };
}
