import { requestEnvironment } from "@/lib/native-consultation/request-environment";
import { createSubmissionHandler } from "@/lib/native-consultation/handler";
import { nativeEnabled } from "@/lib/native-consultation/config";
import { saveConsultation } from "@/lib/native-consultation/storage";
import { isContactOrigin } from "@/lib/anonymous-inquiry/origin";
import { checkContactLimit } from "@/lib/anonymous-inquiry/rate-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const handler = createSubmissionHandler({ enabled: nativeEnabled,
    origin: request => isContactOrigin(request, process.env),
    limit: request => checkContactLimit(request, "consultation"),
    save: async (...args) => {
      return saveConsultation(...args, requestEnvironment(request));
    },
  });
  return handler(request);
}
