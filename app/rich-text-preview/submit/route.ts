import { createInquiryHandler } from "@/lib/anonymous-inquiry/handler";
import { saveSingleForm } from "@/lib/rich-text-preview/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createInquiryHandler({
  enabled: process.env.NODE_ENV === "development",
  origin: process.env.SITE_URL ?? "",
  save: saveSingleForm,
});
