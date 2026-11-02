import "server-only";
import { nativeEnabled } from "./config";
import { SubmissionError } from "./handler";
import { isContactOrigin } from "@/lib/anonymous-inquiry/origin";
import { checkContactLimit } from "@/lib/anonymous-inquiry/rate-limit";
export const privateJson = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
export async function mutationBody(request: Request, scope: "consultation-edit" | "consultation-recovery") {
  if (!nativeEnabled()) throw new SubmissionError(404, "Unavailable");
  if (!isContactOrigin(request, process.env)) throw new SubmissionError(403, "Please continue from this website.");
  await checkContactLimit(request, scope);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SubmissionError(415, "Invalid request format.");
  const reader = request.body?.getReader();
  if (!reader) throw new SubmissionError(400, "Missing request.");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 20_000) { await reader.cancel(); throw new SubmissionError(413, "Your answers are too long."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new SubmissionError(400, "Invalid request."); }
}
export function apiFailure(error: unknown) {
  if (error instanceof SubmissionError) return privateJson({ error: error.message }, error.status);
  if ((error as {status?: number})?.status === 429) return privateJson({ error: "Please wait a moment before trying again." }, 429);
  return privateJson({ error: "We could not confirm the result. Please retry." }, 503);
}
