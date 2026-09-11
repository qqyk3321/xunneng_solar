import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AnonymousInquiryForm } from "@/components/anonymous-inquiry-form";
import styles from "@/components/anonymous-inquiry-form.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "匿名咨询 · 独立测试",
  robots: { index: false, follow: false },
};
export default function ContactPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/">Sol &amp; Tide Energy</Link>
        <span>独立测试页面 · 无需登录</span>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>LET’S TALK</span>
          <h1>
            有什么问题，
            <br />
            都可以在这里告诉我们。
          </h1>
          <p>留下你的邮箱和咨询内容，也可以附上图片帮助我们了解情况。</p>
        </div>
        <AnonymousInquiryForm />
        <p className={styles.pageNote}>
          此页面仅用于测试留言收集，尚未接入首页。不提供在线聊天或平台内回复。
        </p>
      </main>
    </div>
  );
}
