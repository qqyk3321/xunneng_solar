import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  INQUIRY_BUCKET,
  type InquiryReceipt,
} from "@/lib/anonymous-inquiry/config";
import type { InquiryPayload } from "@/lib/anonymous-inquiry/handler";
import {
  IMAGE_PREFIX,
  SINGLE_FORM_ID,
  SINGLE_FORM_TABLE,
  parseSavedForm,
  type StoredImage,
} from "./form";

function storageClient() {
  if (process.env.NODE_ENV !== "development")
    throw new Error("Development only");
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Preview storage unavailable");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        }),
    },
  });
}

export async function saveSingleForm(
  payload: InquiryPayload,
): Promise<InquiryReceipt> {
  const client = storageClient();
  const images: StoredImage[] = [];
  const attempt = randomUUID();
  // Unique files per save: the old document stays usable until the single-row write succeeds.
  // Deliberately no cleanup, history, ownership, or attachment relationship tables in this lab.
  for (let index = 0; index < payload.images.length; index++) {
    const image = payload.images[index];
    const ext = image.mime === "image/jpeg" ? "jpg" : image.mime.split("/")[1];
    const path = `${IMAGE_PREFIX}/${attempt}/${index}.${ext}`;
    const { error } = await client.storage
      .from(INQUIRY_BUCKET)
      .upload(path, image.bytes, { contentType: image.mime, upsert: false });
    if (error) throw new Error("Preview image upload failed");
    images.push({
      id: image.id,
      path,
      mime: image.mime,
      bytes: image.bytes.length,
    });
  }
  const form = parseSavedForm({
    email: payload.email,
    content: payload.content,
    images,
  });
  const { data, error } = await client
    .from(SINGLE_FORM_TABLE)
    .upsert(
      { id: SINGLE_FORM_ID, form, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("id,updated_at,form")
    .single();
  if (error || !data) throw new Error("Preview save not confirmed");
  return {
    reference: data.id,
    receivedAt: data.updated_at,
    content: parseSavedForm(data.form).content,
  };
}

/** Server component entry point: database JSON + freshly signed bucket URLs. */
export async function loadSingleForm() {
  const client = storageClient();
  const { data, error } = await client
    .from(SINGLE_FORM_TABLE)
    .select("form,updated_at")
    .eq("id", SINGLE_FORM_ID)
    .maybeSingle();
  if (error) throw new Error("Preview read failed");
  if (!data) return null;
  const form = parseSavedForm(data.form);
  if (!Number.isFinite(Date.parse(data.updated_at)))
    throw new Error("Invalid saved time");
  const imageUrls: Record<string, string> = {};
  if (form.images.length) {
    const { data: signed, error: signingError } = await client.storage
      .from(INQUIRY_BUCKET)
      .createSignedUrls(
        form.images.map((image) => image.path),
        3600,
      );
    if (!signingError && signed) {
      for (const image of form.images) {
        const item = signed.find((entry) => entry.path === image.path);
        if (item?.signedUrl && !item.error)
          imageUrls[image.id] = item.signedUrl;
      }
    }
  }
  return {
    form,
    updatedAt: data.updated_at as string,
    imageUrls,
    missingImages: form.images.length - Object.keys(imageUrls).length,
  };
}
