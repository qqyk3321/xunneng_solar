import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  INQUIRY_BUCKET,
  INQUIRY_TABLE,
  UUID_PATTERN,
} from "@/lib/anonymous-inquiry/config";
import {
  parseSummary,
  parseSubmission,
  type ListOptions,
  type RawSubmission,
} from "./model";

type Config = {
  enabled: boolean;
  url?: string;
  key?: string;
  fetcher?: typeof fetch;
};
/** This is intentionally a development-only, read-only, unauthenticated test reader. */
export function createContactReader(
  config: Config = {
    enabled: process.env.NODE_ENV === "development",
    url: process.env.SUPABASE_URL?.trim(),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  },
) {
  function client() {
    if (!config.enabled) throw new Error("Development only");
    if (!config.url || !config.key)
      throw new Error("Preview storage unavailable");
    return createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          (config.fetcher ?? fetch)(input, {
            ...init,
            cache: "no-store",
            signal: AbortSignal.timeout(30_000),
          }),
      },
    });
  }
  async function readRow(
    db: ReturnType<typeof client>,
    id: string,
  ): Promise<RawSubmission | null> {
    if (!UUID_PATTERN.test(id)) return null;
    const result = await db
      .from(INQUIRY_TABLE)
      .select("id,email,created_at,format,message,content,images")
      .eq("id", id)
      .maybeSingle();
    if (result.error) throw new Error("Could not load submission");
    // Preserve the stored JSON and image metadata, without adding derived or secret fields.
    return result.data as RawSubmission | null;
  }
  return {
    async rawSubmission(id: string) {
      return readRow(client(), id);
    },
    async list(options: ListOptions) {
      const db = client();
      // Count first so stale/bookmarked page numbers can be clamped before the range query.
      const countResult = await db
        .from(INQUIRY_TABLE)
        .select("id", { count: "exact", head: true });
      if (
        countResult.error ||
        countResult.count === null ||
        !Number.isSafeInteger(countResult.count) ||
        countResult.count < 0
      )
        throw new Error("Could not count submissions");
      const total = countResult.count;
      const pages = Math.max(1, Math.ceil(total / options.size));
      const page = Math.min(options.page, pages);
      if (!total)
        return { rows: [], total, pages, options: { ...options, page } };
      const start = (page - 1) * options.size;
      const result = await db
        .from(INQUIRY_TABLE)
        .select("id,email,created_at,format")
        .order(options.sort, { ascending: options.direction === "asc" })
        .order("id", { ascending: true })
        .range(start, start + options.size - 1);
      if (result.error || !result.data)
        throw new Error("Could not load submissions");
      return {
        rows: result.data.map(parseSummary),
        total,
        pages,
        options: { ...options, page },
      };
    },
    async submission(id: string) {
      const db = client();
      const row = await readRow(db, id);
      if (!row) return null;
      const submission = parseSubmission(row);
      const imageUrls: Record<string, string> = {};
      if (submission.photos.length) {
        try {
          const signed = await db.storage.from(INQUIRY_BUCKET).createSignedUrls(
            submission.photos.map((photo) => photo.path),
            3600,
          );
          if (!signed.error)
            for (const photo of submission.photos) {
              const item = signed.data?.find(
                (item) => item.path === photo.path,
              );
              if (item?.signedUrl && !item.error)
                imageUrls[photo.id] = item.signedUrl;
            }
        } catch {
          /* Retain readable text when image signing is temporarily unavailable. */
        }
      }
      return {
        submission,
        imageUrls,
        missingImages: submission.photos.length - Object.keys(imageUrls).length,
      };
    },
  };
}
