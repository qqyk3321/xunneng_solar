import { timingSafeEqual } from "node:crypto";
import { nativeEnabled } from "@/lib/native-consultation/config";
import { processConsultationNotifications } from "@/lib/native-consultation/notifications";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.CONSULTATION_WORKER_SECRET;
  const supplied = request.headers.get("authorization") || "";
  const actual = Buffer.from(supplied), expected = Buffer.from(`Bearer ${secret}`);
  if (!nativeEnabled() || !secret || secret.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await processConsultationNotifications(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Notification worker unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
