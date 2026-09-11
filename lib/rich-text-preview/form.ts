import {
  MAX_ATTACHMENT_BYTES,
  MAX_IMAGES,
  UUID_PATTERN,
  validEmail,
} from "@/lib/anonymous-inquiry/config";
import {
  validateRichDocument,
  type RichDocument,
} from "@/lib/anonymous-inquiry/rich-text";

export const SINGLE_FORM_TABLE = "rich_text_single_preview";
export const SINGLE_FORM_ID = "00000000-0000-4000-8000-000000000001";
export const IMAGE_PREFIX = "single-form-preview";
export type StoredImage = {
  id: string;
  path: string;
  mime: string;
  bytes: number;
};
export type SavedForm = {
  email: string;
  content: RichDocument;
  images: StoredImage[];
};

/** Only this demo's own files may be signed, never arbitrary paths from a document. */
export function parseSavedForm(value: unknown): SavedForm {
  if (!value || typeof value !== "object")
    throw new Error("Invalid saved form");
  const form = value as Record<string, unknown>;
  if (typeof form.email !== "string" || !validEmail(form.email))
    throw new Error("Invalid email");
  const { document, imageIds } = validateRichDocument(form.content);
  if (
    !Array.isArray(form.images) ||
    form.images.length > MAX_IMAGES ||
    form.images.length !== imageIds.length
  )
    throw new Error("Invalid saved images");
  const images = form.images.map((value: unknown, index): StoredImage => {
    if (!value || typeof value !== "object") throw new Error("Invalid image");
    const image = value as Record<string, unknown>;
    if (
      typeof image.id !== "string" ||
      image.id !== imageIds[index] ||
      typeof image.path !== "string"
    )
      throw new Error("Invalid image reference");
    const parts = image.path.split("/");
    const ext =
      image.mime === "image/webp"
        ? "webp"
        : image.mime === "image/jpeg"
          ? "jpg"
          : image.mime === "image/png"
            ? "png"
            : null;
    if (
      !ext ||
      parts.length !== 3 ||
      parts[0] !== IMAGE_PREFIX ||
      !UUID_PATTERN.test(parts[1]) ||
      parts[2] !== `${index}.${ext}`
    )
      throw new Error("Invalid image path");
    if (
      typeof image.bytes !== "number" ||
      !Number.isInteger(image.bytes) ||
      image.bytes <= 0 ||
      image.bytes > MAX_ATTACHMENT_BYTES
    )
      throw new Error("Invalid image size");
    return {
      id: image.id,
      path: image.path,
      mime: image.mime as string,
      bytes: image.bytes,
    };
  });
  return { email: form.email, content: document, images };
}
