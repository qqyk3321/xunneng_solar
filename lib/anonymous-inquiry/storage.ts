import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { INQUIRY_BUCKET, INQUIRY_TABLE, type InquiryReceipt } from "./config";
import { InquiryError, type InquiryPayload } from "./handler";

export async function saveInquiry(
  payload: InquiryPayload,
): Promise<InquiryReceipt> {
  const url = process.env.SUPABASE_URL?.trim(),
    key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Inquiry storage unavailable");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
    },
  });
  async function existing() {
    const { data, error } = await client
      .from(INQUIRY_TABLE)
      .select("id,created_at,payload_hash,content")
      .eq("id", payload.id)
      .maybeSingle();
    if (error) throw new Error("Inquiry lookup failed");
    if (!data) return null;
    if (data.payload_hash !== payload.digest)
      throw new InquiryError(
        409,
        "这次提交的内容已发生变化，请重新发送一条留言。",
      );
    return {
      reference: data.id,
      receivedAt: data.created_at,
      content: data.content,
    };
  }
  const receipt = await existing();
  if (receipt) return receipt;
  const bucket = client.storage.from(INQUIRY_BUCKET);
  const uploaded: { id: string; path: string; mime: string; bytes: number }[] =
    [];
  const attempt = randomUUID();
  try {
    for (let index = 0; index < payload.images.length; index++) {
      const image = payload.images[index];
      const ext =
        image.mime === "image/jpeg" ? "jpg" : image.mime.split("/")[1];
      const path = `${payload.id}/${attempt}/${index}.${ext}`;
      const result = await bucket.upload(path, image.bytes, {
        upsert: false,
        contentType: image.mime,
      });
      if (result.error) throw new Error("Inquiry image upload failed");
      uploaded.push({
        id: image.id,
        path,
        mime: image.mime,
        bytes: image.bytes.length,
      });
    }
  } catch (error) {
    // No database write was attempted: these known successful uploads are safe to remove.
    if (uploaded.length)
      await bucket.remove(uploaded.map((i) => i.path)).catch(() => undefined);
    throw error;
  }
  const result = await client
    .from(INQUIRY_TABLE)
    .insert({
      ...(payload.format ? { format: payload.format } : {}),
      id: payload.id,
      email: payload.email,
      message: payload.message,
      content: payload.content,
      payload_hash: payload.digest,
      images: uploaded,
    })
    .select("id,created_at,content")
    .single();
  if (!result.error && result.data)
    return {
      reference: result.data.id,
      receivedAt: result.data.created_at,
      content: result.data.content,
    };
  // A timeout can occur AFTER the row committed. Never delete its attachments blindly.
  if (result.error?.code === "23505") {
    if (uploaded.length)
      await bucket.remove(uploaded.map((i) => i.path)).catch(() => undefined);
    const winner = await existing();
    if (winner) return winner;
  } else {
    const committed = await existing();
    if (committed) return committed;
  }
  // Uncertain writes retain private files for manual reconciliation; no public links are issued.
  throw new Error("Inquiry persistence not confirmed");
}
