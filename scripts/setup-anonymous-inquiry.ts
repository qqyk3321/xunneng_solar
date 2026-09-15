// Explicit Storage setup only; apply CLI migrations first. Never imported by a public route.
// Run: node --env-file=.env --import tsx scripts/setup-anonymous-inquiry.ts
import { createClient } from "@supabase/supabase-js";
import {
  INQUIRY_BUCKET,
  INQUIRY_TABLE,
  BUCKET_MAX_BYTES,
} from "../lib/anonymous-inquiry/config";

async function main() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Storage configuration missing.");
  const client = createClient(url, key, { auth: { persistSession: false } });
  const table = await client
    .from(INQUIRY_TABLE)
    .select("id,format,content,images")
    .limit(0);
  if (table.error)
    throw new Error(
      "Apply the contact inquiry migration with supabase db push first.",
    );
  const mimes = ["image/jpeg", "image/png", "image/webp"];
  const existing = await client.storage.getBucket(INQUIRY_BUCKET);
  if (!existing.data) {
    if (String(existing.error?.statusCode) !== "404")
      throw new Error("Cannot inspect inquiry bucket.");
    const result = await client.storage.createBucket(INQUIRY_BUCKET, {
      public: false,
      fileSizeLimit: BUCKET_MAX_BYTES,
      allowedMimeTypes: mimes,
    });
    if (result.error) throw new Error("Cannot create inquiry bucket.");
  }
  const result = await client.storage.getBucket(INQUIRY_BUCKET);
  if (
    result.error ||
    !result.data ||
    result.data.public ||
    Number(result.data.file_size_limit) !== BUCKET_MAX_BYTES ||
    result.data.allowed_mime_types?.length !== mimes.length ||
    !mimes.every((m) => result.data?.allowed_mime_types?.includes(m))
  )
    throw new Error("Unexpected bucket configuration; nothing overwritten.");
  console.log(
    `${INQUIRY_TABLE}: accessible to server. ${INQUIRY_BUCKET}: private, JPEG/PNG/WebP, bucket maximum ${BUCKET_MAX_BYTES} bytes (endpoint enforces its own smaller limit).`,
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Setup failed");
  process.exitCode = 1;
});
