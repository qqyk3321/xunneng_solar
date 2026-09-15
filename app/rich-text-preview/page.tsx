import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnonymousInquiryForm } from "@/components/anonymous-inquiry-form";
import styles from "@/components/anonymous-inquiry-form.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "单份表单 · 富文本实验",
  robots: { index: false, follow: false },
};

export default function RichTextPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span>RICH TEXT LAB · 独立实验</span>
        <Link href="/rich-text-preview/view" prefetch={false}>查看已保存的表单 →</Link>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>EDIT → SAVE → PREVIEW</span>
          <h1>只保存一份，随时读回预览。</h1>
          <p>填写 → 本机压缩图片 → 保存到 Supabase → 在独立页面显示图文。</p>
          <p>
            每次从空白表单填写，保存后整份覆盖上一次的邮箱、文字和图片引用。暂不做旧内容回填编辑或图片清理。
          </p>
        </div>
        <AnonymousInquiryForm variant="single-document" />
        <p className={styles.pageNote}>
          不改首页，不接工单，不发邮件。此实验使用独立数据表，原咨询记录不受影响。
        </p>
      </main>
    </div>
  );
}
