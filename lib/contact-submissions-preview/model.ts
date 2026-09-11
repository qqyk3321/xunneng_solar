import {
  BUCKET_MAX_BYTES,
  MAX_IMAGES,
  MAX_TEXT,
  UUID_PATTERN,
  validEmail,
} from "@/lib/anonymous-inquiry/config";
import {
  validateRichDocument,
  type RichDocument,
} from "@/lib/anonymous-inquiry/rich-text";

export const LIST_PATH = "/contact-submissions-preview";
export const PAGE_SIZES = [10, 25, 50] as const;
export type SearchParams = Record<string, string | string[] | undefined>;
export type ListOptions = {
  page: number;
  size: number;
  sort: "created_at" | "email";
  direction: "asc" | "desc";
};
export type SubmissionSummary = {
  id: string;
  email: string;
  createdAt: string;
  format: "plain" | "rich" | null;
};
export type SavedPhoto = { id: string; path: string };
export type RawSubmission = {
  id: string;
  email: string;
  created_at: string;
  format: "plain" | "rich" | null;
  message: string;
  content: unknown;
  images: unknown[];
};
export type Submission = SubmissionSummary & {
  message: string;
  content: RichDocument | null;
  photos: SavedPhoto[];
  displayFormat: "plain" | "rich";
};
export type SubmissionPreviewData = {
  submission: Omit<Submission, "photos"> & { photos: { id: string }[] };
  imageUrls: Record<string, string>;
  missingImages: number;
};

export function listOptions(params: SearchParams = {}): ListOptions {
  const page =
    typeof params.page === "string" && /^\d{1,6}$/.test(params.page)
      ? Number(params.page)
      : 1;
  const size = typeof params.size === "string" ? Number(params.size) : 10;
  return {
    page: Math.max(1, page),
    size: PAGE_SIZES.some((value) => value === size) ? size : 10,
    sort: params.sort === "email" ? "email" : "created_at",
    direction: params.direction === "asc" ? "asc" : "desc",
  };
}
export function listQuery(options: ListOptions): string {
  return new URLSearchParams({
    page: String(options.page),
    size: String(options.size),
    sort: options.sort,
    direction: options.direction,
  }).toString();
}
export function listHref(options: ListOptions): string {
  return `${LIST_PATH}?${listQuery(options)}`;
}
export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
  }).format(new Date(value));
}
export function formatLabel(format: SubmissionSummary["format"]): string {
  return format === "plain"
    ? "Plain text"
    : format === "rich"
      ? "Rich text"
      : "Legacy";
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid submission");
  return value as Record<string, unknown>;
}
export function parseSummary(value: unknown): SubmissionSummary {
  const row = record(value);
  if (
    typeof row.id !== "string" ||
    !UUID_PATTERN.test(row.id) ||
    typeof row.email !== "string" ||
    !validEmail(row.email) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at)) ||
    (row.format !== null && row.format !== "plain" && row.format !== "rich")
  )
    throw new Error("Invalid submission metadata");
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    format: row.format,
  };
}
export function parseSubmission(value: unknown): Submission {
  const row = record(value),
    summary = parseSummary(row);
  if (typeof row.message !== "string" || row.message.length > MAX_TEXT)
    throw new Error("Invalid saved message");
  const displayFormat = summary.format ?? (row.content ? "rich" : "plain");
  const rich =
    displayFormat === "rich" ? validateRichDocument(row.content) : null;
  if (!Array.isArray(row.images) || row.images.length > MAX_IMAGES)
    throw new Error("Invalid saved photos");
  if (summary.format === "plain" && row.images.length)
    throw new Error("Plain messages cannot contain photos");
  const photos = row.images.map((value, index): SavedPhoto => {
    const image = record(value);
    if (typeof image.path !== "string") throw new Error("Invalid photo path");
    const parts = image.path.split("/");
    const ext =
      image.mime === "image/webp"
        ? "webp"
        : image.mime === "image/png"
          ? "png"
          : image.mime === "image/jpeg"
            ? "jpg"
            : null;
    // Never sign other submissions' files, singleton test files, URLs or traversal paths.
    if (
      !ext ||
      parts.length !== 3 ||
      parts[0] !== summary.id ||
      !UUID_PATTERN.test(parts[1]) ||
      parts[2] !== `${index}.${ext}` ||
      typeof image.bytes !== "number" ||
      !Number.isInteger(image.bytes) ||
      image.bytes <= 0 ||
      image.bytes > BUCKET_MAX_BYTES
    )
      throw new Error("Invalid saved photo");
    const id = image.id;
    if (id != null && (typeof id !== "string" || !UUID_PATTERN.test(id)))
      throw new Error("Invalid photo ID");
    if (rich && (typeof id !== "string" || !rich.imageIds.includes(id)))
      throw new Error("Unbound photo");
    return {
      id: typeof id === "string" ? id : `legacy-${index}`,
      path: image.path,
    };
  });
  if (
    new Set(photos.map((photo) => photo.id)).size !== photos.length ||
    (rich && rich.imageIds.length !== photos.length)
  )
    throw new Error("Invalid photo references");
  return {
    ...summary,
    message: row.message,
    content: rich?.document ?? null,
    photos,
    displayFormat,
  };
}
