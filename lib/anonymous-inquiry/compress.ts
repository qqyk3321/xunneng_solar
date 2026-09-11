import { detectImageMime, imageDimensions } from "@/lib/image-lab/config";
import { MAX_SOURCE_BYTES } from "./config";
import { encodeWithinBudget } from "./compression-policy";

export type InquiryImage = { file: File; url: string; originalBytes: number };

// All image processing is local. Nothing is uploaded until the form is sent.
export async function compressInquiryImage(file: File): Promise<InquiryImage> {
  if (!file.size || file.size > MAX_SOURCE_BYTES)
    throw new Error("每张原图须小于 10 MB。");
  if (!detectImageMime(new Uint8Array(await file.slice(0, 12).arrayBuffer())))
    throw new Error("图片仅支持 JPEG、PNG、WebP，暂不支持 GIF、HEIC 或视频。");
  const source = URL.createObjectURL(file);
  const img = new Image();
  const canvas = document.createElement("canvas");
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("这张图片无法读取，请选择其他图片。"));
      img.src = source;
    });
    if (
      img.naturalWidth * img.naturalHeight > 25_000_000 ||
      Math.max(img.naturalWidth, img.naturalHeight) > 12000
    )
      throw new Error(
        "图片尺寸过大，请选择不超过 2500 万像素、单边不超过 12000 像素的图片。",
      );
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器无法处理图片，请换一个浏览器重试。");
    let format = "image/webp";
    const encode = (type: string, quality: number) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("图片压缩失败，请重试。"))),
          type,
          quality,
        ),
      );
    const blob = await encodeWithinBudget(async ({ maxEdge, quality }) => {
      const size = imageDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxEdge,
      );
      canvas.width = size.width;
      canvas.height = size.height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // A white background makes transparent screenshots readable, including JPEG fallback.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size.width, size.height);
      // Always resample the source, not a previously lossy encoded candidate.
      ctx.drawImage(img, 0, 0, size.width, size.height);
      let candidate = await encode(format, quality);
      if (format === "image/webp" && candidate.type !== "image/webp") {
        format = "image/jpeg";
        candidate = await encode(format, quality);
      }
      return candidate;
    });
    const output = new File(
      [blob],
      `image.${blob.type === "image/webp" ? "webp" : "jpg"}`,
      { type: blob.type },
    );
    return {
      file: output,
      url: URL.createObjectURL(output),
      originalBytes: file.size,
    };
  } finally {
    URL.revokeObjectURL(source);
    img.src = "";
    canvas.width = 0;
    canvas.height = 0;
  }
}
