import {
  detectImageMime,
  imageDimensions,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  PRESETS,
  type ImageMime,
} from "./config";

export type ImageVariant = {
  id: string;
  label: string;
  blob: Blob;
  localUrl: string;
  width: number;
  height: number;
  mime: ImageMime;
  quality: number | null;
  encodeMs: number;
};

export async function prepareImages(
  file: File,
  format: "image/webp" | "image/jpeg",
  resize: boolean,
) {
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    throw new Error("请选择大于 0 且不超过 20 MB 的图片。");
  const mime = detectImageMime(
    new Uint8Array(await file.slice(0, 12).arrayBuffer()),
  );
  if (!mime)
    throw new Error("仅支持 JPEG、PNG、WebP；暂不支持 SVG、GIF、HEIC。");
  const sourceUrl = URL.createObjectURL(file);
  const variants: ImageVariant[] = [];
  const image = new Image();
  const decodeStart = performance.now();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("图片无法解码，请换一张完整的图片。"));
      image.src = sourceUrl;
    });
    const decodeMs = performance.now() - decodeStart;
    const width = image.naturalWidth,
      height = image.naturalHeight;
    if (
      !width ||
      !height ||
      width * height > MAX_IMAGE_PIXELS ||
      Math.max(width, height) > 12000
    )
      throw new Error(
        "图片分辨率过大：本实验限制 4000 万像素，单边不超过 12000 像素。",
      );
    // Keep original bytes exactly as selected; no metadata stripping/re-encode.
    variants.push({
      id: "original",
      label: "原图",
      blob: file,
      localUrl: sourceUrl,
      width,
      height,
      mime,
      quality: null,
      encodeMs: 0,
    });
    for (const preset of PRESETS) {
      // Yield between encodes so the page can paint its processing state.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const start = performance.now();
      const dimensions = imageDimensions(
        width,
        height,
        resize ? preset.maxEdge : undefined,
      );
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      try {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("当前浏览器无法创建图片画布。");
        if (format === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value
                ? resolve(value)
                : reject(new Error("图片编码失败，请尝试更小的图片。")),
            format,
            preset.quality,
          ),
        );
        if (blob.type !== format)
          throw new Error("当前浏览器不支持所选输出格式，请切换到 JPEG。");
        variants.push({
          id: preset.id,
          label: preset.label,
          blob,
          localUrl: URL.createObjectURL(blob),
          ...dimensions,
          mime: format,
          quality: preset.quality,
          encodeMs: performance.now() - start,
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    return { variants, decodeMs };
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    variants.forEach((variant) => URL.revokeObjectURL(variant.localUrl));
    throw error;
  } finally {
    image.src = "";
  }
}
