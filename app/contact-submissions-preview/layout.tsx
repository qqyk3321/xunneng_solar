import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contact submissions | Sol & Tide Energy",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ContactPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/home-preview#contact-us">Sol &amp; Tide Energy</Link>
        <span className={styles.badge}>Contact us · Test workspace</span>
      </header>
      <main className={styles.main}>
        <aside className={styles.notice}>
          Local testing only. No sign-in is required: anyone with access to this
          test server can view all messages and email addresses. Use test data
          only.
        </aside>
        {children}
      </main>
    </div>
  );
}
