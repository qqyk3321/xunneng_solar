export const INQUIRY_TABLE = "anonymous_inquiries_preview";
export const INQUIRY_BUCKET = "anonymous-inquiry-images-preview";
export const MAX_IMAGES = 3;
export const MAX_TEXT = 5000;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
// Existing private bucket retains its historical ceiling; this endpoint is much stricter.
export const BUCKET_MAX_BYTES = 1536 * 1024;
export const MAX_ATTACHMENT_BYTES = 150 * 1024;
export const TARGET_IMAGE_BYTES = 100 * 1024;
export const MAX_REQUEST_BYTES = 768 * 1024;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

export type InquiryReceipt = {
  reference: string;
  receivedAt: string;
  content?: import("./rich-text").RichDocument | null;
};
