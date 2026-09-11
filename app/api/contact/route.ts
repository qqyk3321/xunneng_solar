import { createContactHandler } from "@/lib/anonymous-inquiry/contact-handler";
import { isContactOrigin } from "@/lib/anonymous-inquiry/origin";
import { checkContactLimit } from "@/lib/anonymous-inquiry/rate-limit";
import { saveInquiry } from "@/lib/anonymous-inquiry/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anonymous write-only endpoint. Listing, previews and downloads stay local-only.
export const POST = createContactHandler({
  enabled: true,
  origin: (request) => isContactOrigin(request, process.env),
  beforeRead: checkContactLimit,
  save: saveInquiry,
});
