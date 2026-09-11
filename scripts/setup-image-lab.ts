// Explicit, manual setup; never called from a public route.
// node --env-file=.env --import tsx scripts/setup-image-lab.ts
import { createClient } from "@supabase/supabase-js";
import {
  IMAGE_LAB_BUCKET,
  IMAGE_MIMES,
  MAX_IMAGE_BYTES,
} from "../lib/image-lab/config";

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Missing server Storage configuration.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = await client.storage.getBucket(IMAGE_LAB_BUCKET);
  if (!existing.data) {
    if (String(existing.error?.statusCode) !== "404")
      throw new Error("Cannot inspect the test bucket; no changes made.");
    const { error } = await client.storage.createBucket(IMAGE_LAB_BUCKET, {
      public: false,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: [...IMAGE_MIMES],
    });
    if (error) throw new Error("Cannot create the test bucket.");
  }
  const { data, error } = await client.storage.getBucket(IMAGE_LAB_BUCKET);
  if (
    error ||
    !data ||
    data.public ||
    Number(data.file_size_limit) !== MAX_IMAGE_BYTES ||
    data.allowed_mime_types?.length !== IMAGE_MIMES.length ||
    !IMAGE_MIMES.every((mime) => data.allowed_mime_types?.includes(mime))
  )
    throw new Error(
      "Bucket configuration differs; refusing to modify an existing bucket automatically.",
    );
  console.log(
    `${IMAGE_LAB_BUCKET}: private; JPEG/PNG/WebP; maximum ${MAX_IMAGE_BYTES} bytes. No existing objects changed.`,
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Bucket setup failed.",
  );
  process.exitCode = 1;
});
