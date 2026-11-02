import type { RequestEnvironment } from "./request-environment";
import "server-only";
import { randomUUID } from "node:crypto";
import { previewPath, previewToken, tokenHash } from "@solortide/consultation-core/tokens";
import type { ConsultationInput, Receipt, ConsultationRecord } from "@solortide/consultation-core";
import { consultationDatabase, nativeEnabled, tokenSecret } from "./config";
import { SubmissionError } from "./handler";
export async function saveConsultation(requestId: string, input: ConsultationInput, digest: string, environment: RequestEnvironment): Promise<Receipt> {
  const id = randomUUID(), secret = tokenSecret();
  const { data, error } = await consultationDatabase().rpc("submit_native_consultation", {
    p_request_id: requestId, p_digest: digest, p_id: id, p_input: input,
    p_token_hash: tokenHash(previewToken(id, secret)), p_context: { environment, noticeVersion: input.privacyVersion },
  });
  if (error?.code === "PT409") throw new SubmissionError(409, "This request was already used with different answers. Reload to recover the original submission.");
  if (error || !data) throw new SubmissionError(503, "We could not confirm the result. Retry this submission to check safely.");
  return { id: data.id, reference: data.submission_id, submittedAt: data.submitted_at, previewPath: previewPath(data.id, data.country_code, secret) };
}
export async function loadNativePreview(token: string): Promise<ConsultationRecord | null> {
  if (!nativeEnabled() || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await consultationDatabase().from("consultation_access_tokens")
    .select("consultation_id,expires_at,revoked_at").eq("token_hash", tokenHash(token)).maybeSingle();
  if (error) throw Error("Consultation preview unavailable");
  if (!data || data.revoked_at || (data.expires_at && data.expires_at !== "infinity" && Date.parse(data.expires_at) <= Date.now())) return null;
  const result = await consultationDatabase().from("consultation_records").select("*").eq("consultation_id", data.consultation_id).maybeSingle();
  if (result.error) throw Error("Consultation preview unavailable");
  return result.data as ConsultationRecord | null;
}
