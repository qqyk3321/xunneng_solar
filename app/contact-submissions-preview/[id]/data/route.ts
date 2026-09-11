import { createContactReader } from "@/lib/contact-submissions-preview/server";
import { createPreviewHandler } from "@/lib/contact-submissions-preview/preview-handler";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return createPreviewHandler({
    enabled: process.env.NODE_ENV === "development",
    load: (id) => createContactReader().submission(id),
  })(id);
}
