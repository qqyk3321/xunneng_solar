import { MAX_ATTACHMENT_BYTES, TARGET_IMAGE_BYTES } from "./config";

export const COMPRESSION_STEPS = [
  { maxEdge: 1920, quality: 0.8 },
  { maxEdge: 1600, quality: 0.78 },
  { maxEdge: 1280, quality: 0.72 },
  { maxEdge: 1280, quality: 0.6 },
  { maxEdge: 1024, quality: 0.65 },
] as const;

/** Bounded work: stop once the budget is met; retain the smallest candidate if sizes vary. */
export async function encodeWithinBudget(
  encode: (step: (typeof COMPRESSION_STEPS)[number]) => Promise<Blob>,
) {
  let smallest: Blob | undefined;
  for (const step of COMPRESSION_STEPS) {
    const blob = await encode(step);
    if (!blob.size || !["image/webp", "image/jpeg"].includes(blob.type))
      throw new Error("浏览器无法输出有效的压缩图片，请换一个浏览器重试。");
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (smallest.size <= TARGET_IMAGE_BYTES) return smallest;
  }
  if (!smallest || smallest.size > MAX_ATTACHMENT_BYTES)
    throw new Error("图片压缩后仍超过 150 KB，为保留清晰度，请裁剪关键区域后重新添加。");
  return smallest;
}
