import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AntiguaSolarCalculator } from "@/components/antigua-solar-calculator";
import Link from "next/link";
import styles from "@/components/antigua-solar-calculator.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Antigua solar calculator | Sol & Tide Energy",
  robots: { index: false, follow: false },
};

export default function AntiguaCalculatorPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>
          Sol<span>&</span>Tide
        </span>
        <Link href="/test-pages" prefetch={false}>
          Back to test pages
        </Link>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>ANTIGUA · CALCULATOR PREVIEW</p>
          <h1>Home solar & battery calculator</h1>
          <p>Slide to set your monthly electricity bill.</p>
        </div>
        <AntiguaSolarCalculator />
      </main>
    </div>
  );
}
