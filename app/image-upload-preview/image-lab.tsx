"use client";

/* eslint-disable @next/next/no-img-element -- Compare original browser blobs and stored bytes without Next image optimization. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CloudUpload,
  Download,
  ImagePlus,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
import { prepareImages, type ImageVariant } from "@/lib/image-lab/compress";
import {
  formatBytes,
  IMAGE_LAB_BUCKET,
  MAX_IMAGE_BYTES,
} from "@/lib/image-lab/config";
import type { StoredImage } from "@/lib/image-lab/upload-handler";
import styles from "./image-lab.module.css";

type UploadState = {
  status: "uploading" | "done" | "error";
  result?: StoredImage;
  ms?: number;
  error?: string;
};

export function ImageLab() {
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"image/webp" | "image/jpeg">(
    "image/webp",
  );
  const [resize, setResize] = useState(true);
  const [variants, setVariants] = useState<ImageVariant[]>([]);
  const [decodeMs, setDecodeMs] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [remoteView, setRemoteView] = useState<Record<string, boolean>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>(
    {},
  );
  const ownedUrls = useRef<string[]>([]);
  const generation = useRef(0);
  const activeUpload = useRef<AbortController | null>(null);
  const busy = processing || uploading || !ready;

  useEffect(() => {
    setReady(true);
    return () => {
      // Monotonic cancellation token, not a DOM ref snapshot.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      ownedUrls.current.forEach((url) => URL.revokeObjectURL(url));
      activeUpload.current?.abort();
    };
  }, []);

  async function processFile(
    next: File,
    nextFormat = format,
    nextResize = resize,
  ) {
    const run = ++generation.current;
    ownedUrls.current.forEach((url) => URL.revokeObjectURL(url));
    ownedUrls.current = [];
    setFile(next);
    setVariants([]);
    setUploads({});
    setRemoteView({});
    setPreviewErrors({});
    setError("");
    setProcessing(true);
    try {
      const prepared = await prepareImages(next, nextFormat, nextResize);
      if (run !== generation.current) {
        prepared.variants.forEach((v) => URL.revokeObjectURL(v.localUrl));
        return;
      }
      ownedUrls.current = prepared.variants.map((v) => v.localUrl);
      setVariants(prepared.variants);
      setDecodeMs(prepared.decodeMs);
    } catch (failure) {
      if (run === generation.current)
        setError(failure instanceof Error ? failure.message : "图片处理失败。");
    } finally {
      if (run === generation.current) setProcessing(false);
    }
  }

  async function upload(selected: ImageVariant[]) {
    if (busy || activeUpload.current) return;
    setUploading(true);
    const controller = new AbortController();
    activeUpload.current = controller;
    try {
      for (const variant of selected) {
        if (controller.signal.aborted) break;
        setUploads((previous) => ({
          ...previous,
          [variant.id]: { status: "uploading" },
        }));
        const start = performance.now();
        try {
          const response = await fetch("/image-upload-preview/upload", {
            method: "POST",
            headers: { "Content-Type": variant.mime },
            body: variant.blob,
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? "上传失败。");
          if (result.bytes !== variant.blob.size)
            throw new Error("服务端收到的文件大小与本地不一致。");
          setUploads((previous) => ({
            ...previous,
            [variant.id]: {
              status: "done",
              result,
              ms: performance.now() - start,
            },
          }));
          setRemoteView((previous) => ({ ...previous, [variant.id]: true }));
        } catch (failure) {
          if (controller.signal.aborted) break;
          setUploads((previous) => ({
            ...previous,
            [variant.id]: {
              status: "error",
              error: failure instanceof Error ? failure.message : "上传失败。",
            },
          }));
        }
      }
    } finally {
      if (!controller.signal.aborted) setUploading(false);
      activeUpload.current = null;
    }
  }

  return (
    <div className={styles.page} lang="zh-CN">
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Sol &amp; Tide Energy
        </Link>
        <span>
          <FlaskConical size={15} aria-hidden="true" />
          独立实验页 · 无需登录
        </span>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>BROWSER IMAGE LAB</p>
          <h1>先在浏览器变轻，再上传。</h1>
          <p>
            一张图片，四种方案。对比原始文件与不同压缩等级的画质、体积、处理时间和真实云端上传结果。
          </p>
        </div>
        <section className={styles.controls} aria-label="图片实验设置">
          <label className={styles.filePicker}>
            <ImagePlus size={28} aria-hidden="true" />
            <strong>{file ? file.name : "选择一张图片开始对比"}</strong>
            <span>JPEG / PNG / WebP · 最大 20 MB · 最大 4000 万像素</span>
            <input
              aria-label="选择测试图片"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const picked = event.target.files?.[0];
                if (picked) void processFile(picked);
                event.target.value = "";
              }}
            />
          </label>
          <div className={styles.options}>
            <label>
              压缩输出格式
              <select
                aria-label="压缩输出格式"
                value={format}
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value as typeof format;
                  setFormat(value);
                  if (file) void processFile(file, value);
                }}
              >
                <option value="image/webp">WebP（支持透明）</option>
                <option value="image/jpeg">JPEG（透明区域填白）</option>
              </select>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={resize}
                disabled={busy}
                onChange={(event) => {
                  setResize(event.target.checked);
                  if (file)
                    void processFile(file, format, event.target.checked);
                }}
              />
              同时限制长边尺寸
            </label>
            <p>
              {resize
                ? "高清 ≤ 3200 px · 均衡 ≤ 1920 px · 省流量 ≤ 1280 px；不放大小图。"
                : "三个压缩档保留原始分辨率，只改变编码质量，便于单独比较压缩能力。"}
            </p>
          </div>
        </section>
        <p className={styles.note}>
          选择图片只在本机处理，不自动上传。原图保留原始字节及元数据；压缩图重新编码，可能移除
          EXIF。仅测试静态图片，动图不保留动画。质量参数不是“保留画质百分比”，也不保证每一档一定更小。
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {processing && (
          <div role="status" className={styles.processing}>
            正在本机解码并生成三个压缩版本…
          </div>
        )}
        {!!variants.length && (
          <>
            <div className={styles.toolbar}>
              <div>
                <h2>压缩对比</h2>
                <p>
                  原图解码 {decodeMs.toFixed(0)} ms · 以下压缩耗时包含缩放与编码
                </p>
              </div>
              <button
                className={styles.primary}
                disabled={
                  busy ||
                  variants.every(
                    (v) =>
                      uploads[v.id]?.status === "done" ||
                      v.blob.size > MAX_IMAGE_BYTES,
                  )
                }
                onClick={() =>
                  void upload(
                    variants.filter(
                      (v) =>
                        uploads[v.id]?.status !== "done" &&
                        v.blob.size <= MAX_IMAGE_BYTES,
                    ),
                  )
                }
              >
                <CloudUpload size={17} aria-hidden="true" />
                {uploading ? "正在上传…" : "上传全部待上传版本"}
              </button>
            </div>
            <div className={styles.grid}>
              {variants.map((variant) => {
                const state = uploads[variant.id];
                const difference =
                  (1 - variant.blob.size / variants[0].blob.size) * 100;
                const extension =
                  variant.mime === "image/jpeg"
                    ? "jpg"
                    : variant.mime.split("/")[1];
                return (
                  <article
                    className={styles.card}
                    key={variant.id}
                    data-variant={variant.id}
                  >
                    <div className={styles.cardHeading}>
                      <h3>{variant.label}</h3>
                      <span>
                        {variant.quality === null
                          ? "不压缩"
                          : `质量参数 ${Math.round(variant.quality * 100)}%`}
                      </span>
                    </div>
                    <a
                      className={styles.preview}
                      href={
                        remoteView[variant.id] && state?.result
                          ? state.result.signedUrl
                          : variant.localUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={
                          remoteView[variant.id] && state?.result
                            ? state.result.signedUrl
                            : variant.localUrl
                        }
                        alt={`${variant.label}${remoteView[variant.id] ? "云端" : "本地"}预览`}
                        onError={() =>
                          setPreviewErrors((previous) => ({
                            ...previous,
                            [variant.id]: true,
                          }))
                        }
                        onLoad={() =>
                          setPreviewErrors((previous) => ({
                            ...previous,
                            [variant.id]: false,
                          }))
                        }
                      />
                    </a>
                    {previewErrors[variant.id] && (
                      <p className={styles.error} role="alert">
                        预览加载失败。云端链接一小时后过期，可切回本地预览。
                      </p>
                    )}
                    <div className={styles.cardBody}>
                      <div className={styles.size}>
                        {formatBytes(variant.blob.size)}
                        <small>
                          {variant.id === "original"
                            ? "对照基准"
                            : difference >= 0
                              ? `减少 ${difference.toFixed(1)}%`
                              : `增大 ${(-difference).toFixed(1)}%`}
                        </small>
                      </div>
                      <dl>
                        <div>
                          <dt>分辨率</dt>
                          <dd>
                            {variant.width} × {variant.height}
                          </dd>
                        </div>
                        <div>
                          <dt>格式</dt>
                          <dd>{extension.toUpperCase()}</dd>
                        </div>
                        <div>
                          <dt>本机压缩</dt>
                          <dd>
                            {variant.id === "original"
                              ? "无需编码"
                              : `${variant.encodeMs.toFixed(0)} ms`}
                          </dd>
                        </div>
                        <div>
                          <dt>上传 + 签名</dt>
                          <dd>
                            {state?.ms
                              ? `${(state.ms / 1000).toFixed(2)} s`
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                      <div className={styles.actions}>
                        <button
                          disabled={
                            busy ||
                            state?.status === "done" ||
                            variant.blob.size > MAX_IMAGE_BYTES
                          }
                          onClick={() => void upload([variant])}
                        >
                          {state?.status === "done"
                            ? "已上传"
                            : state?.status === "uploading"
                              ? "上传中…"
                              : "上传此版本"}
                        </button>
                        <a
                          href={variant.localUrl}
                          download={`image-${variant.id}.${extension}`}
                          aria-label={`下载${variant.label}版本`}
                        >
                          <Download size={16} aria-hidden="true" />
                        </a>
                      </div>
                      {variant.blob.size > MAX_IMAGE_BYTES && (
                        <p className={styles.error}>
                          编码结果超过 20 MB，无法上传。
                        </p>
                      )}
                      {state?.error && (
                        <p role="alert" className={styles.error}>
                          {state.error}
                        </p>
                      )}
                      {state?.result && (
                        <div className={styles.stored}>
                          <span>已写入私有 bucket</span>
                          <button
                            onClick={() =>
                              setRemoteView((previous) => ({
                                ...previous,
                                [variant.id]: !previous[variant.id],
                              }))
                            }
                          >
                            {remoteView[variant.id]
                              ? "切换本地预览"
                              : "切换云端预览"}
                          </button>
                          <a
                            href={state.result.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            打开云端图片
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {!variants.length && !processing && (
          <div className={styles.empty}>
            <ImagePlus size={36} aria-hidden="true" />
            <h2>先看差异，再决定上传哪一档</h2>
            <p>本实验展示浏览器原生 Canvas 的能力，不经过服务端压缩。</p>
          </div>
        )}
        <footer className={styles.footer}>
          <strong>测试存储：{IMAGE_LAB_BUCKET}</strong>
          <p>
            文件经本地后端转存，不需要登录。预览链接有效期 1
            小时，链接过期不代表文件删除。重新选择图片或刷新页面不删除已上传文件；测试文件暂时保留在专用
            bucket 中。上传耗时含本机到后端、后端到 Supabase
            和签名请求，不是纯带宽测速。
          </p>
        </footer>
      </main>
    </div>
  );
}
