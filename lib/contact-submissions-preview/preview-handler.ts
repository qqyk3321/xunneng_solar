import { UUID_PATTERN } from "@/lib/anonymous-inquiry/config";
import type { SubmissionPreviewData } from "./model";

export function createPreviewHandler({
  enabled,
  load,
}: {
  enabled: boolean;
  load: (id: string) => Promise<SubmissionPreviewData | null>;
}) {
  return async (id: string): Promise<Response> => {
    const respond = (body: unknown, status: number) =>
      Response.json(body, {
        status,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    if (!enabled) return respond({ error: "Not found." }, 404);
    if (!UUID_PATTERN.test(id))
      return respond({ error: "Submission not found." }, 404);
    try {
      const saved = await load(id);
      if (!saved) return respond({ error: "Submission not found." }, 404);
      // Only presentation data is sent; raw storage metadata remains on the server.
      const { photos, ...submission } = saved.submission;
      return respond(
        {
          ...saved,
          submission: {
            ...submission,
            photos: photos.map((photo) => ({ id: photo.id })),
          },
        },
        200,
      );
    } catch {
      return respond(
        { error: "We couldn’t load this preview. Please try again." },
        503,
      );
    }
  };
}
