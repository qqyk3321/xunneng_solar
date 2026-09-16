"use client";

/* eslint-disable @next/next/no-img-element -- Preview the local compressed blob, without image optimization. */
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Mail,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  compressInquiryImage,
  type InquiryImage,
} from "@/lib/anonymous-inquiry/compress";
import {
  MAX_IMAGES,
  MAX_TEXT,
  UUID_PATTERN,
  validEmail,
  type InquiryReceipt,
} from "@/lib/anonymous-inquiry/config";
import { formatBytes } from "@/lib/image-lab/config";
import styles from "./anonymous-inquiry-form.module.css";
import type { InquiryEditorHandle } from "./inquiry-rich-editor";
import { InquiryRichContent } from "./inquiry-rich-content";
import {
  EMPTY_DOCUMENT,
  richImageIds,
  richTextPlainText,
  validateRichDocument,
  type RichDocument,
} from "@/lib/anonymous-inquiry/rich-text";

const InquiryRichEditor = lazy(async () => {
  const editorModule = await import("./inquiry-rich-editor");
  return { default: editorModule.InquiryRichEditor };
});

type DraftImage = InquiryImage & { id: string };

function requestId() {
  // crypto.randomUUID is unavailable on plain HTTP LAN origins; getRandomValues is supported.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function AnonymousInquiryForm({
  variant = "inquiry",
}: { variant?: "inquiry" | "single-document" } = {}) {
  const singleDocument = variant === "single-document";
  const [email, setEmail] = useState("");
  const [content, setContent] = useState<RichDocument>(EMPTY_DOCUMENT);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [preview, setPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"email" | "message" | null>(
    null,
  );
  const [receipt, setReceipt] = useState<InquiryReceipt | null>(null);
  const imageRef = useRef<DraftImage[]>([]);
  const alive = useRef(false);
  const locked = useRef(false);
  const id = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<InquiryEditorHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const busy = !ready || !editorReady || processing || sending;
  const message = richTextPlainText(content).trim();
  const activeImageIds = richImageIds(content);
  const activeImages = activeImageIds.flatMap((id) =>
    images.filter((img) => img.id === id),
  );
  const imageUrls = Object.fromEntries(images.map((img) => [img.id, img.url]));

  useEffect(() => {
    alive.current = true;
    setReady(true);
    return () => {
      alive.current = false;
      controller.current?.abort();
      imageRef.current.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, []);
  useEffect(() => {
    if (receipt) successHeading.current?.focus();
  }, [receipt]);
  useEffect(() => {
    if (error && !fieldError) errorBox.current?.focus();
  }, [error, fieldError]);

  function edited() {
    id.current = null;
    setError("");
    setFieldError(null);
  }
  function updateImages(next: DraftImage[]) {
    imageRef.current = next;
    setImages(next);
  }
  async function addImages(files: File[]) {
    if (!files.length || locked.current) return;
    if (activeImageIds.length + files.length > MAX_IMAGES) {
      setError("最多添加 3 张图片，请减少选择数量。");
      return;
    }
    // Keep removed images for undo, but bound this draft's retained Blob memory.
    if (imageRef.current.length + files.length > 10) {
      setError(
        "本次编辑已处理较多图片。为避免占用过多内存，请保留文字并刷新页面后重新添加图片。",
      );
      return;
    }
    locked.current = true;
    setProcessing(true);
    setError("");
    const added: DraftImage[] = [];
    try {
      for (const file of files) {
        const processed = await compressInquiryImage(file);
        added.push({ ...processed, id: requestId() });
        if (!alive.current) throw new Error("页面已离开");
      }
      updateImages([...imageRef.current, ...added]);
      messageInput.current?.insertImages(added.map((img) => img.id));
      edited();
    } catch (e) {
      added.forEach((img) => URL.revokeObjectURL(img.url));
      if (alive.current)
        setError(e instanceof Error ? e.message : "图片处理失败，请重试。");
    } finally {
      locked.current = false;
      if (alive.current) setProcessing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || busy) return;
    setError("");
    setFieldError(null);
    if (!validEmail(email.trim())) {
      setError("请填写有效的联系邮箱，例如 name@example.com。");
      setFieldError("email");
      emailInput.current?.focus();
      return;
    }
    let validated;
    try {
      validated = validateRichDocument(content);
    } catch (error) {
      setError(error instanceof Error ? error.message : "请检查富文本内容。");
      setFieldError("message");
      messageInput.current?.focus();
      return;
    }
    const form = new FormData(event.currentTarget);
    form.set("email", email.trim());
    form.set("content", JSON.stringify(validated.document));
    if (!id.current) id.current = requestId();
    form.set("requestId", id.current);
    for (const imageId of validated.imageIds) {
      const image = imageRef.current.find((img) => img.id === imageId);
      if (!image) {
        setError("正文图片已失效，请移除后重新添加。");
        return;
      }
      form.append("images", image.file);
    }
    locked.current = true;
    setSending(true);
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 120_000);
    try {
      const response = await fetch(
        singleDocument
          ? "/rich-text-preview/submit"
          : "/contact-preview/submit",
        {
          method: "POST",
          body: form,
          signal: abort.signal,
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "暂时无法发送，请稍后重试。",
        );
      if (
        !UUID_PATTERN.test(result?.reference ?? "") ||
        !Number.isFinite(Date.parse(result?.receivedAt))
      )
        throw new Error("未收到有效的提交确认，请稍后重试。");
      if (!alive.current) return;
      validateRichDocument(result.content);
      setReceipt(result);
      setEmail("");
    } catch (e) {
      if (alive.current)
        setError(
          abort.signal.aborted
            ? "请求超时，暂时无法确认是否已收到。内容已保留，直接重试不会重复保存同一条留言。"
            : e instanceof Error && e.name !== "TypeError"
              ? e.message
              : "网络连接失败，内容已保留，请检查网络后重试。",
        );
    } finally {
      clearTimeout(timeout);
      locked.current = false;
      if (alive.current) setSending(false);
    }
  }

  if (receipt)
    return (
      <section
        className={`${styles.card} ${styles.success}`}
        aria-live="polite"
      >
        <div className={styles.successIcon}>
          <Check size={30} aria-hidden="true" />
        </div>
        <h2 ref={successHeading} tabIndex={-1}>
          {singleDocument ? "表单已保存" : "留言已收到"}
        </h2>
        <p>
          {singleDocument
            ? "这份表单已写入 Supabase，并替换上一次的内容。打开独立预览页，可以验证从数据库和 bucket 重新读取的结果。"
            : "你的咨询内容已成功保存。后续工作人员将通过你填写的邮箱与你联系，请留意收件箱和垃圾邮件文件夹。"}
        </p>
        <div className={styles.receipt}>
          <span>
            {singleDocument ? "固定记录 ID（每次覆盖这一份）" : "提交回执"}
          </span>
          <code>{receipt.reference}</code>
        </div>
        <p className={styles.hint}>
          {singleDocument
            ? "本实验不发送邮件，不保存历史版本，也不会删除旧图片。"
            : "无需重复发送。本页面没有在线回复功能，也没有发送自动确认邮件。"}
        </p>
        {singleDocument && (
          <p>
            <Link className={styles.primary} href="/rich-text-preview/view" prefetch={false}>
              打开独立预览页
            </Link>
          </p>
        )}
        <details className={styles.savedPreview} open>
          <summary>查看已保存的富文本（数据库返回）</summary>
          <InquiryRichContent content={receipt.content} imageUrls={imageUrls} />
          <p className={styles.hint}>
            文字格式和图片位置来自数据库；此处图片使用当前页面的本地预览。
          </p>
        </details>
        <button
          className={styles.primary}
          type="button"
          onClick={() => {
            imageRef.current.forEach((img) => URL.revokeObjectURL(img.url));
            updateImages([]);
            setContent(EMPTY_DOCUMENT);
            setPreview(false);
            setEditorReady(false);
            setReceipt(null);
            edited();
          }}
        >
          {singleDocument ? "重新填写并覆盖" : "再写一条留言"}
        </button>
      </section>
    );

  return (
    <section className={styles.card} aria-labelledby="inquiry-title">
      <div className={styles.cardHeading}>
        <div>
          <h2 id="inquiry-title">
            {singleDocument ? "填写测试表单" : "留下你的咨询"}
          </h2>
          <p>无需注册或登录，带 * 的内容为必填项。</p>
        </div>
        <Mail size={25} aria-hidden="true" />
      </div>
      {singleDocument && (
        <p className={styles.error}>
          共享测试：任何能访问本地测试地址的人都能查看或覆盖同一份表单。请使用测试邮箱和测试图片，不要提交真实客户资料。保存会整份替换，无法恢复上一份。
        </p>
      )}
      <form onSubmit={submit} noValidate aria-busy={processing || sending}>
        <fieldset disabled={busy} className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="inquiry-email">
              联系邮箱 <span>*</span>
            </label>
            <input
              ref={emailInput}
              id="inquiry-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              value={email}
              required
              placeholder="name@example.com"
              aria-invalid={fieldError === "email"}
              aria-describedby={
                fieldError === "email" ? "inquiry-error" : "email-hint"
              }
              onChange={(e) => {
                setEmail(e.target.value);
                edited();
              }}
            />
            <p id="email-hint" className={styles.hint}>
              {singleDocument
                ? "测试可填写 demo@example.com，此实验不会发送邮件。"
                : "请确认邮箱填写正确，这是我们后续联系你的方式。"}
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor="inquiry-message">
              咨询内容 <span>*</span>
            </label>
            <div className={styles.editor}>
              <Suspense
                fallback={<p role="status">正在准备文字编辑器…</p>}
              >
                <InquiryRichEditor
                  onPickImages={() => fileInput.current?.click()}
                  canAddImage={activeImages.length < MAX_IMAGES}
                  onReady={setEditorReady}
                  ref={messageInput}
                  disabled={busy}
                  invalid={fieldError === "message"}
                  resolveImage={(id) =>
                    imageRef.current.find((img) => img.id === id)?.url
                  }
                  onFiles={(files) => {
                    void addImages(files);
                  }}
                  onChange={(value) => {
                    setContent(value);
                    edited();
                  }}
                />
              </Suspense>
              {activeImages.length > 0 && (
                <ul className={styles.images}>
                  {activeImages.map((img, index) => (
                    <li key={img.url}>
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`预览图片 ${index + 1}`}
                      >
                        <img src={img.url} alt={`咨询附件 ${index + 1}`} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          messageInput.current?.removeImage(img.id);
                          edited();
                        }}
                        aria-label={`移除图片 ${index + 1}`}
                      >
                        <X size={15} />
                      </button>
                      <span
                        title={`原图 ${formatBytes(img.originalBytes)} → 上传 ${formatBytes(img.file.size)}`}
                      >
                        {formatBytes(img.file.size)}
                        {img.file.size < img.originalBytes && (
                          <>
                            {" "}
                            · 省{" "}
                            {Math.round(
                              (1 - img.file.size / img.originalBytes) * 100,
                            )}
                            %
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.toolbar}>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={activeImages.length >= MAX_IMAGES}
                >
                  <ImagePlus size={18} aria-hidden="true" />
                  插入正文图片{" "}
                  <span>
                    {activeImages.length}/{MAX_IMAGES}
                  </span>
                </button>
                <button
                  type="button"
                  aria-expanded={preview}
                  onClick={() => setPreview(!preview)}
                >
                  预览排版
                </button>
                <span>
                  {message.length}/{MAX_TEXT}
                </span>
              </div>
            </div>
            {preview && (
              <div className={styles.savedPreview} aria-label="富文本排版预览">
                <InquiryRichContent content={content} imageUrls={imageUrls} />
              </div>
            )}
            <input
              ref={fileInput}
              className={styles.hiddenInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-label="选择咨询图片"
              onChange={(e) => {
                const files = Array.from(e.currentTarget.files ?? []);
                e.currentTarget.value = "";
                void addImages(files);
              }}
            />
            <p id="image-hint" className={styles.hint}>
              支持标题、对齐、加粗、斜体、列表、引用和图文混排。图片插入光标位置，也可粘贴或拖入本地图片。图片可选，最多
              3 张。支持 JPG、PNG、WebP，每张原图不超过 10
              MB；优先保持清晰，默认转 WebP，目标每张约 100 KB，最多 150
              KB。透明背景转白。细字不清楚时请裁剪关键区域再上传。暂不支持视频。
            </p>
          </div>
          <div className={styles.trap} aria-hidden="true">
            <label htmlFor="inquiry-website">网站地址（请留空）</label>
            <input
              id="inquiry-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </fieldset>
        {processing && (
          <p className={styles.progress} role="status">
            <LoaderCircle className={styles.spin} size={16} />
            正在本机处理图片，尚未上传……
          </p>
        )}
        {error && (
          <div
            id="inquiry-error"
            className={styles.error}
            ref={errorBox}
            tabIndex={-1}
            role="alert"
          >
            {error}
          </div>
        )}
        <div className={styles.sendRow}>
          <p>
            <ShieldCheck size={17} aria-hidden="true" />
            {singleDocument
              ? "保存将覆盖上一份测试表单"
              : "邮箱、文字和图片不公开展示"}
          </p>
          <button type="submit" className={styles.primary} disabled={busy}>
            {sending ? (
              <LoaderCircle size={18} className={styles.spin} />
            ) : (
              <Send size={17} />
            )}{" "}
            {sending
              ? "正在发送，请稍候…"
              : singleDocument
                ? "保存并替换表单"
                : "发送咨询"}
          </button>
        </div>
        <p className={styles.disclaimer}>
          {singleDocument
            ? "这里只验证富文本保存、图片上传与独立预览，不做账号、工单或历史管理。图片只上传压缩后的文件，旧图片暂不清理。"
            : "发送即表示你同意我们为处理本次咨询保存以上信息，并通过邮箱联系你。请勿填写密码、验证码或上传敏感证件。"}
        </p>
      </form>
    </section>
  );
}
