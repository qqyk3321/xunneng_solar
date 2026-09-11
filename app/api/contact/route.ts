import { createContactHandler } from "@/lib/anonymous-inquiry/contact-handler";
import { isContactOrigin } from "@/lib/anonymous-inquiry/origin";
import { checkContactLimit } from "@/lib/anonymous-inquiry/rate-limit";
import { saveInquiry } from "@/lib/anonymous-inquiry/storage";
import { randomUUID } from "node:crypto";
import { InquiryError } from "@/lib/anonymous-inquiry/handler";
import {
  contactFailureLog,
  dependencyFailure,
} from "@/lib/anonymous-inquiry/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anonymous write-only endpoint. Listing, previews and downloads stay local-only.
const requestIds = new WeakMap<Request, string>();
const handle = createContactHandler({
  enabled: true,
  origin: (request) => isContactOrigin(request, process.env),
  beforeRead: async (request) => {
    try {
      await checkContactLimit(request);
    } catch (error) {
      if (error instanceof InquiryError && error.status < 500) throw error;
      throw dependencyFailure("upstash.limit", error);
    }
  },
  save: async (payload) => {
    try {
      return await saveInquiry(payload);
    } catch (error) {
      if (error instanceof InquiryError) throw error;
      throw dependencyFailure("supabase.request", error);
    }
  },
  onError: (error, request) => {
    console.error(
      JSON.stringify(
        contactFailureLog(error, requestIds.get(request)!, process.env),
      ),
    );
  },
});

export async function POST(request: Request) {
  const requestId = randomUUID();
  requestIds.set(request, requestId);
  try {
    const response = await handle(request);
    response.headers.set("X-Contact-Request-Id", requestId);
    return response;
  } finally {
    requestIds.delete(request);
  }
}
