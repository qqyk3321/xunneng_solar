import { createHash } from "node:crypto";
import { detectImageMime, type ImageMime } from "@/lib/image-lab/config";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_IMAGES,
  MAX_REQUEST_BYTES,
  MAX_TEXT,
  UUID_PATTERN,
  validEmail,
  type InquiryReceipt,
} from "./config";
import {
  MAX_DOCUMENT_BYTES,
  validateRichDocument,
  type RichDocument,
} from "./rich-text";

export type InquiryPayload = {
  format?: "plain" | "rich";
  id: string;
  email: string;
  message: string;
  content: RichDocument;
  digest: string;
  images: { id: string; bytes: Uint8Array; mime: ImageMime }[];
};
export class InquiryError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}
type Dependencies = {
  allowFormat?: boolean;
  enabled: boolean;
  origin: string | ((request: Request) => boolean);
  beforeRead?: (request: Request) => Promise<void>;
  save: (payload: InquiryPayload) => Promise<InquiryReceipt>;
};
function json(body: unknown, status = 200, retryAfter = 60) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(status === 429 ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}
export function createInquiryHandler(deps: Dependencies) {
  let active = 0,
    attempts = 0,
    windowStart = Date.now();
  const inFlight = new Set<string>();
  return async (request: Request) => {
    if (!deps.enabled) return json({ error: "此页面仅用于本地测试。" }, 404);
    if (
      !(typeof deps.origin === "string"
        ? request.headers.get("origin") === deps.origin
        : deps.origin(request))
    )
      return json({ error: "请求来源不被允许，请从测试页面发送。" }, 403);
    if (Date.now() - windowStart >= 60_000) {
      attempts = 0;
      windowStart = Date.now();
    }
    if (active >= 2 || attempts >= 20)
      return json({ error: "发送过于频繁，请等待一分钟再试。" }, 429);
    active++;
    attempts++;
    let lockedId: string | undefined;
    try {
      await deps.beforeRead?.(request);
      const contentType = request.headers.get("content-type") ?? "";
      if (!contentType.startsWith("multipart/form-data;"))
        throw new InquiryError(415, "提交格式不正确。");
      if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES)
        throw new InquiryError(413, "提交内容过大，请减少图片后重试。");
      const reader = request.body?.getReader();
      if (!reader) throw new InquiryError(400, "请填写邮箱和咨询内容。");
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_REQUEST_BYTES) {
            await reader.cancel();
            throw new InquiryError(413, "提交内容过大，请减少图片后重试。");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const body = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      let form: FormData;
      try {
        form = await new Response(body, {
          headers: { "Content-Type": contentType },
        }).formData();
      } catch {
        throw new InquiryError(400, "提交内容无法解析，请重试。");
      }
      const field = (key: string) => {
        const entries = form.getAll(key);
        if (entries.length !== 1 || typeof entries[0] !== "string")
          throw new InquiryError(400, "提交字段不完整或重复。");
        return entries[0];
      };
      for (const key of form.keys())
        if (
          ![
            "email",
            "content",
            "requestId",
            "website",
            "images",
            ...(deps.allowFormat ? ["format"] : []),
          ].includes(key)
        )
          throw new InquiryError(400, "提交包含不支持的字段。");
      const email = field("email").trim().toLowerCase();
      const rawContent = field("content");
      if (new TextEncoder().encode(rawContent).length > MAX_DOCUMENT_BYTES)
        throw new InquiryError(413, "富文本结构过大，请简化格式后重试。");
      let rich;
      try {
        rich = validateRichDocument(JSON.parse(rawContent));
      } catch (error) {
        throw new InquiryError(
          400,
          error instanceof SyntaxError
            ? "富文本数据无法解析，请重试。"
            : error instanceof Error
              ? error.message
              : "富文本格式无效。",
        );
      }
      const { document: content, text: message, imageIds } = rich;
      let format: InquiryPayload["format"];
      if (deps.allowFormat) {
        const requested = field("format");
        if (requested !== "plain" && requested !== "rich")
          throw new InquiryError(400, "Invalid message format.");
        format = requested;
        if (
          format === "plain" &&
          (imageIds.length ||
            content.content.some(
              (node) =>
                node.type !== "paragraph" ||
                node.attrs ||
                node.content?.some(
                  (child) => child.type !== "text" || child.marks?.length,
                ),
            ))
        )
          throw new InquiryError(
            400,
            "Plain messages cannot include formatting or photos.",
          );
      }
      const id = field("requestId");
      if (field("website"))
        throw new InquiryError(400, "无法提交，请刷新页面后重试。");
      if (!validEmail(email))
        throw new InquiryError(400, "请填写有效的联系邮箱。");
      if (
        message.length < 5 ||
        message.length > MAX_TEXT ||
        message.includes("\0")
      )
        throw new InquiryError(400, "咨询内容请填写 5–5000 个字符。");
      if (!UUID_PATTERN.test(id))
        throw new InquiryError(400, "提交标识无效，请刷新后重试。");
      const uploads = form.getAll("images");
      if (uploads.length > MAX_IMAGES)
        throw new InquiryError(400, "最多添加 3 张图片。");
      const images: InquiryPayload["images"] = [];
      for (const [index, file] of uploads.entries()) {
        if (
          typeof file === "string" ||
          !file.size ||
          file.size > MAX_ATTACHMENT_BYTES
        )
          throw new InquiryError(
            413,
            "每张上传图片须大于 0 且不超过 150 KB，请压缩后重试。",
          );
        const bytes = new Uint8Array(await file.arrayBuffer());
        const mime = detectImageMime(bytes);
        if (!mime || mime !== file.type)
          throw new InquiryError(
            415,
            "图片内容与类型不匹配，仅支持 JPEG、PNG、WebP。",
          );
        images.push({ id: imageIds[index], bytes, mime });
      }
      if (imageIds.length !== uploads.length)
        throw new InquiryError(
          400,
          "正文图片与上传文件不一致，请重新添加图片。",
        );
      const digest = createHash("sha256")
        .update(
          JSON.stringify([
            email,
            message,
            content,
            images.map((i) => [
              i.mime,
              createHash("sha256").update(i.bytes).digest("hex"),
            ]),
            ...(format ? [format] : []),
          ]),
        )
        .digest("hex");
      if (inFlight.has(id))
        throw new InquiryError(429, "这条留言正在发送，请稍后再试。");
      inFlight.add(id);
      lockedId = id;
      const receipt = await deps.save({
        ...(format ? { format } : {}),
        id,
        email,
        message,
        content,
        images,
        digest,
      });
      return json(receipt, 201);
    } catch (error) {
      return error instanceof InquiryError
        ? json({ error: error.message }, error.status, error.retryAfter)
        : json(
            {
              error:
                "暂时无法确认提交结果。内容已保留，请稍后重试；相同内容重试不会重复保存。",
            },
            503,
          );
    } finally {
      active--;
      if (lockedId) inFlight.delete(lockedId);
    }
  };
}
