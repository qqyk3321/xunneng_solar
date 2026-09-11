import {
  detectImageMime,
  IMAGE_MIMES,
  MAX_IMAGE_BYTES,
  type ImageMime,
} from "./config";

export type StoredImage = {
  path: string;
  signedUrl: string;
  expiresAt: string;
  bytes: number;
  mime: ImageMime;
};
type Dependencies = {
  enabled: boolean;
  origin: string;
  store: (bytes: Uint8Array, mime: ImageMime) => Promise<StoredImage>;
};
class UploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}

export function createImageUploadHandler(deps: Dependencies) {
  let inFlight = 0,
    attempts = 0,
    windowStart = Date.now();
  return async function POST(request: Request) {
    if (!deps.enabled)
      return json({ error: "此上传接口仅用于本地开发测试。" }, 404);
    if (request.headers.get("origin") !== deps.origin)
      return json({ error: "不允许的请求来源。" }, 403);
    if (Date.now() - windowStart >= 60_000) {
      attempts = 0;
      windowStart = Date.now();
    }
    if (inFlight >= 2 || attempts >= 30)
      return json({ error: "测试上传频率过高，请稍后重试。" }, 429);
    attempts++;
    inFlight++;
    try {
      const mime = request.headers.get("content-type")?.split(";")[0].trim();
      if (!IMAGE_MIMES.some((value) => value === mime))
        throw new UploadError(415, "仅接受 JPEG、PNG、WebP 图片。");
      if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES)
        throw new UploadError(413, "单个文件不能超过 20 MB。");
      const reader = request.body?.getReader();
      if (!reader) throw new UploadError(400, "缺少图片内容。");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > MAX_IMAGE_BYTES) {
            await reader.cancel();
            throw new UploadError(413, "单个文件不能超过 20 MB。");
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const detected = detectImageMime(bytes);
      if (!detected || detected !== mime)
        throw new UploadError(415, "文件内容与图片类型不匹配。");
      return json(await deps.store(bytes, detected));
    } catch (error) {
      return error instanceof UploadError
        ? json({ error: error.message }, error.status)
        : json({ error: "上传或生成预览失败，请稍后重试。" }, 503);
    } finally {
      inFlight--;
    }
  };
}
