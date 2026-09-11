import { createContactHandler } from "@/lib/anonymous-inquiry/contact-handler";
import { saveInquiry } from "@/lib/anonymous-inquiry/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createContactHandler({
  enabled: process.env.NODE_ENV === "development",
  origin: process.env.AUTH_PREVIEW_ORIGIN ?? "http://192.168.1.176:3003",
  save: saveInquiry,
});
