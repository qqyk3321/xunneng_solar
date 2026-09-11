import { createContactReader } from "@/lib/contact-submissions-preview/server";
import { createDownloadHandler } from "@/lib/contact-submissions-preview/export";

export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formats = new URL(request.url).searchParams.getAll("format");
  const reader = createContactReader();
  return createDownloadHandler({
    enabled: process.env.NODE_ENV === "development",
    loadRaw: reader.rawSubmission,
    loadPreview: reader.submission,
  })(id, formats.length === 1 ? formats[0] : null);
}
