import { z } from "zod";
import { apiFailure, mutationBody, privateJson } from "@/lib/native-consultation/api";
import { validEmailAccess } from "@/lib/native-consultation/email-access-token";
import { tokenSecret } from "@/lib/native-consultation/config";
import { grantManagement, managementDevice, setManagementCookie } from "@/lib/native-consultation/management";
import { loadNativePreview } from "@/lib/native-consultation/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const parsed = z.object({ credential: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict()
      .safeParse(await mutationBody(request, "consultation-edit"));
    if (!parsed.success) return privateJson({ error: "This email link is invalid. Please open your latest assessment email." }, 400);
    const row = await loadNativePreview((await params).token);
    if (!row || !validEmailAccess(parsed.data.credential, row.consultation_id, row.email, tokenSecret()))
      return privateJson({ error: "This email link is no longer valid. Please contact our team for a new assessment email." }, 403);
    const device = (await managementDevice(true))!;
    await grantManagement(row.consultation_id, device);
    const response = privateJson({ ok: true });
    setManagementCookie(response, device);
    return response;
  } catch (error) { return apiFailure(error); }
}
