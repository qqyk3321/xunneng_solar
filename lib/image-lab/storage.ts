import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { IMAGE_LAB_BUCKET, type ImageMime } from "./config";
import type { StoredImage } from "./upload-handler";

export async function storeLabImage(
  bytes: Uint8Array,
  mime: ImageMime,
): Promise<StoredImage> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Storage not configured");
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(45_000) }),
    },
  });
  const bucket = client.storage.from(IMAGE_LAB_BUCKET);
  const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const path = `experiments/${randomUUID()}.${extension}`;
  const upload = await bucket.upload(path, bytes, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false,
  });
  if (upload.error) throw new Error("Storage upload failed");
  const preview = await bucket.createSignedUrl(path, 3600);
  if (preview.error || !preview.data?.signedUrl) {
    // Only roll back this newly created object, never other bucket contents.
    await bucket.remove([path]);
    throw new Error("Storage preview failed");
  }
  return {
    path,
    signedUrl: preview.data.signedUrl,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    bytes: bytes.length,
    mime,
  };
}
