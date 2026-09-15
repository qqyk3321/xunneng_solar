import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSingleForm } from "@/lib/rich-text-preview/storage";
import { InquiryRichContent } from "@/components/inquiry-rich-content";
import styles from "@/components/anonymous-inquiry-form.module.css";
import labStyles from "../preview.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "已保存的表单 · 独立预览",
  robots: { index: false, follow: false },
};

export default async function SavedFormPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  let saved: Awaited<ReturnType<typeof loadSingleForm>> = null;
  let failed = false;
  try {
    saved = await loadSingleForm();
  } catch {
    failed = true;
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/rich-text-preview" prefetch={false}>← 填写表单</Link>
        <span>独立预览 · 从 Supabase 读取</span>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>SAVED DOCUMENT</span>
          <h1>已保存的表单</h1>
          <p>
            正文从数据库读取，图片从 bucket
            加载。不依赖编辑页、本机临时图片或登录状态。
          </p>
        </div>
        <p className={labStyles.notice}>
          共享测试数据：任何能访问本地测试地址的人都能查看或覆盖这份表单。请勿提交真实客户资料。
        </p>
        {failed ? (
          <section className={styles.card} role="alert">
            <h2>暂时无法读取表单</h2>
            <p>
              可能是网络或 Supabase
              配置问题。请稍后重新读取；这不代表已保存的内容被清空。
            </p>
          </section>
        ) : saved ? (
          <section className={styles.card} aria-label="数据库表单预览">
            <dl className={labStyles.metadata}>
              <div>
                <dt>联系邮箱</dt>
                <dd data-testid="saved-email">{saved.form.email}</dd>
              </div>
              <div>
                <dt>最后保存</dt>
                <dd>
                  <time dateTime={saved.updatedAt}>
                    {new Intl.DateTimeFormat("zh-CN", {
                      timeZone: "Asia/Shanghai",
                      dateStyle: "medium",
                      timeStyle: "medium",
                      hour12: false,
                    }).format(new Date(saved.updatedAt))}
                    （北京时间）
                  </time>
                </dd>
              </div>
            </dl>
            {saved.missingImages > 0 && (
              <p className={styles.error} role="alert">
                有 {saved.missingImages}{" "}
                张图片暂时无法加载，请重新读取。正文仍可预览。
              </p>
            )}
            <article aria-label="已保存正文">
              <InquiryRichContent
                content={saved.form.content}
                imageUrls={saved.imageUrls}
              />
            </article>
            <details className={styles.savedPreview}>
              <summary>看看数据库实际保存了什么（JSON）</summary>
              <p className={styles.hint}>
                正文保存格式和图片 ID；images 保存 ID 对应的 bucket
                路径。没有原图、Base64 或临时预览地址。
              </p>
              <pre className={labStyles.json}>
                {JSON.stringify(saved.form, null, 2)}
              </pre>
            </details>
            <p className={styles.hint}>
              图片临时访问地址有效期为 1
              小时，重新读取即可获取新地址；这不是文件的过期删除时间。
            </p>
          </section>
        ) : (
          <section className={styles.card}>
            <h2>还没有保存的表单</h2>
            <p>先去填写一份文字和图片，再回到这里查看。</p>
          </section>
        )}
        <nav className={labStyles.actions} aria-label="表单操作">
          <Link className={styles.primary} href="/rich-text-preview/view" prefetch={false}>
            重新读取最新内容
          </Link>
          <Link href="/rich-text-preview" prefetch={false}>重新填写并覆盖</Link>
        </nav>
      </main>
    </div>
  );
}
