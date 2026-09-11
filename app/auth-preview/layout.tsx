import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthBrandImage } from "./auth-ui";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import styles from "./auth-preview.module.css";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Account Access | Sol & Tide Energy",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className={styles.page}>
      <header className={styles.brandHeader}>
        <div className={styles.brandBar}>
          <Link
            href="/auth-preview"
            className={styles.brand}
            aria-label="Sol & Tide account access"
          >
            <AuthBrandImage src="https://lh3.googleusercontent.com/aida/AEtjO1WPNtpXd7d1nIKg0LfhBy6ElD25kX1NTa_8TLCS-zXGUpBIi_MVxPJqctT26cexsS2XJWpA9BvPWOjLdNvJfAkqLDumY5LuJChwPVgXIjfX22ANulgWmMHVWjleRaEd9-Ezj2CKXyJ4whI33nm_JUI_xOP0f3Kj0oUGVhY5eOiHUv4l-YVs4TRw2V2hcknbQyLLClFyxHzKV-6p9jVJHegiPkDZ34GY4qO7GxuigYtF5lx824PFr4KR0Hw" />
            <span>
              <strong>Sol &amp; Tide</strong>
              <small>Antigua Clean Energy</small>
            </span>
          </Link>
          <span className={styles.previewBadge}>
            <i aria-hidden="true" />
            Account Preview
          </span>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.shell}>{children}</div>
        <p className={styles.pageFooter}>
          <LockKeyhole size={14} aria-hidden="true" /> Sol &amp; Tide · Account
          access
        </p>
      </main>
    </div>
  );
}
