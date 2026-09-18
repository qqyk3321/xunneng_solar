"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSiteRegion } from "./site-region";
import styles from "@/app/faq/faq.module.css";

/** Legacy bookmarks ask for a country; no unscoped FAQ content is rendered. */
export function CountryFaqEntry() {
  const { choose } = useSiteRegion();
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    choose("faq");
  }, [choose]);
  return (
    <main className={styles.main}>
      <div className={styles.intro}>
        <h1>Choose your country.</h1>
        <p>Select a location to explore your local solar FAQs.</p>
        <button
          type="button"
          onClick={() => choose("faq")}
          aria-haspopup="dialog"
        >
          Choose country →
        </button>
        <p>
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
