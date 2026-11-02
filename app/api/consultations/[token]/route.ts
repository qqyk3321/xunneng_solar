import { requestEnvironment } from "@/lib/native-consultation/request-environment";
import { createHash } from "node:crypto";
import { tokenHash } from "@solortide/consultation-core/tokens";
import { loadNativePreview } from "@/lib/native-consultation/storage";
import { consultationDatabase, nativeEnabled } from "@/lib/native-consultation/config";
import { canManage, managementDevice } from "@/lib/native-consultation/management";
import { editSchema, submissionInput } from "@/lib/native-consultation/edit-schema";
import { inputSchema } from "@/lib/native-consultation/schema";
import { apiFailure, mutationBody, privateJson } from "@/lib/native-consultation/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    if (!nativeEnabled()) return privateJson({ error: "Unavailable" }, 404);
    const row = await loadNativePreview((await params).token);
    if (!row) return privateJson({ error: "Assessment unavailable." }, 404);
    if (!await canManage(row.consultation_id)) return privateJson({ error: "Open the QR code in your assessment email to edit." }, 403);
    return privateJson({ submission: { ...row, native: true } });
  } catch (error) { return apiFailure(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    const raw = await mutationBody(request, "consultation-edit");
    const parsed = editSchema.safeParse(raw);
    if (!parsed.success) return privateJson({ error: "Please check your answers." }, 422);
    const row = await loadNativePreview((await params).token);
    if (!row) return privateJson({ error: "Assessment unavailable." }, 404);
    const device = await managementDevice();
    if (!device || !await canManage(row.consultation_id)) return privateJson({ error: "Open the QR code in your assessment email to continue editing." }, 403);
    const { requestId, revision, change } = parsed.data;
    const input = inputSchema.safeParse({ ...submissionInput(row), ...change.values });
    if (!input.success) return privateJson({ error: "Please check your answers.", fields: Object.fromEntries(input.error.issues.map(i => [i.path.join("."), i.message])) }, 422);
    const result = await consultationDatabase().rpc("update_native_consultation", { p_id: row.consultation_id,
      p_token_hash: tokenHash(device), p_request_id: requestId, p_revision: revision, p_section: change.section,
      p_digest: createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex"), p_input: input.data, p_environment: requestEnvironment(request) });
    if (result.error?.code === "PT409") return privateJson({ error: "This assessment has changed. Your unsaved answers are still here.", conflict: true, latest: await loadNativePreview((await params).token) }, 409);
    if (result.error?.code === "PT403") return privateJson({ error: "Open the QR code in your assessment email to continue editing." }, 403);
    if (result.error) throw Error("Update unavailable");
    return privateJson({ submission: { ...await loadNativePreview((await params).token), native: true } });
  } catch (error) { return apiFailure(error); }
}
