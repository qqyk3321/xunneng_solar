import { createInquiryHandler } from "@/lib/anonymous-inquiry/handler";
import { saveInquiry } from "@/lib/anonymous-inquiry/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createInquiryHandler({
  enabled: process.env.NODE_ENV === "development",
  origin: process.env.SITE_URL ?? "",
  save: saveInquiry,
});
