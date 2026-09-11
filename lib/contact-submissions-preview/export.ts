import { UUID_PATTERN } from "@/lib/anonymous-inquiry/config";
import type { RichNode } from "@/lib/anonymous-inquiry/rich-text";
import type { RawSubmission, SubmissionPreviewData } from "./model";

/** Keep literal newlines, hard breaks and every empty paragraph; never trim/collapse. */
export function extractMessage(saved: SubmissionPreviewData): string {
  const { submission, imageUrls } = saved;
  const photo = (id: string) => {
    const index = submission.photos.findIndex((photo) => photo.id === id);
    const url = imageUrls[id];
    if (index < 0 || !url) throw new Error("Photo link unavailable");
    return `[Image ${index + 1}]\n${url}`;
  };
  function render(node: RichNode): string {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    if (node.type === "inquiryImage") return photo(node.attrs?.id ?? "");
    const children = node.content ?? [];
    if (node.type === "paragraph" || node.type === "heading")
      return children.map(render).join("");
    if (node.type === "bulletList" || node.type === "orderedList") {
      return children
        .map((item, index) => {
          const prefix =
            node.type === "bulletList"
              ? "- "
              : `${(node.attrs?.start ?? 1) + index}. `;
          return (
            prefix +
            render(item)
              .split("\n")
              .join(`\n${" ".repeat(prefix.length)}`)
          );
        })
        .join("\n");
    }
    return children.map(render).join("\n");
  }
  if (submission.displayFormat === "rich" && submission.content)
    return render(submission.content);
  return (
    submission.message +
    (submission.photos.length
      ? `\n\n${submission.photos.map((image) => photo(image.id)).join("\n\n")}`
      : "")
  );
}

export function textExport(
  saved: SubmissionPreviewData,
  now = new Date(),
): string {
  const header = [
    "CONTACT US SUBMISSION",
    `Reference: ${saved.submission.id}`,
    `Email: ${saved.submission.email}`,
    `Submitted at (UTC): ${saved.submission.createdAt}`,
    `Exported at (UTC): ${now.toISOString()}`,
  ];
  if (saved.submission.photos.length)
    header.push(
      "Image links are private and expire approximately one hour after export. Download again to renew them. Image files are not included.",
    );
  return `${header.join("\n")}\n\nMessage:\n${extractMessage(saved)}\n`;
}

export function createDownloadHandler({
  enabled,
  loadRaw,
  loadPreview,
}: {
  enabled: boolean;
  loadRaw: (id: string) => Promise<RawSubmission | null>;
  loadPreview: (id: string) => Promise<SubmissionPreviewData | null>;
}) {
  return async (id: string, format: string | null): Promise<Response> => {
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    };
    const error = (message: string, status: number) =>
      Response.json({ error: message }, { status, headers });
    if (!enabled || !UUID_PATTERN.test(id))
      return error("Submission not found.", 404);
    if (format !== "json" && format !== "text")
      return error("Choose JSON or text download.", 400);
    try {
      let body: string;
      if (format === "json") {
        const raw = await loadRaw(id);
        if (!raw) return error("Submission not found.", 404);
        body = JSON.stringify(raw, null, 2) + "\n";
      } else {
        const saved = await loadPreview(id);
        if (!saved) return error("Submission not found.", 404);
        if (saved.missingImages)
          return error(
            "Some photo links could not be prepared. Please try again or download the original JSON.",
            503,
          );
        body = textExport(saved);
      }
      return new Response(body, {
        headers: {
          ...headers,
          "Content-Type":
            format === "json"
              ? "application/json; charset=utf-8"
              : "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="contact-${id}.${format === "json" ? "json" : "txt"}"`,
        },
      });
    } catch {
      return error("We couldn’t prepare this download. Please try again.", 503);
    }
  };
}
