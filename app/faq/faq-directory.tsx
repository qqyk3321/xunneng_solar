"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AssessmentLink } from "@/components/assessment-link";
import { SectionAnchor } from "@/components/section-anchor";
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  searchFaq,
  type FaqCategory,
} from "@/lib/faq/content";
import styles from "./faq.module.css";

export function FaqDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const search = useRef<HTMLInputElement>(null);
  const results = searchFaq(query, category);
  const searching = query.trim().length > 0;
  function clear() {
    setQuery("");
    setCategory("all");
    search.current?.focus();
  }
  return (
    <>
      <div className={styles.searchArea} role="search" aria-label="FAQ search">
        <label htmlFor="faq-search">Search the FAQ</label>
        <div className={styles.searchField}>
          <input
            ref={search}
            id="faq-search"
            type="search"
            autoComplete="off"
            placeholder="Try ‘battery’, ‘warranty’ or ‘electricity bill’"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-controls="faq-results"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
            >
              Clear search
            </button>
          )}
        </div>
      </div>
      <div className={styles.workspace}>
        <aside className={styles.topics} aria-label="FAQ topics">
          <h2>Browse by topic</h2>
          <div role="group" aria-label="Filter questions by topic">
            <button
              type="button"
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              All questions <span aria-hidden="true">{FAQ_ITEMS.length}</span>
            </button>
            {FAQ_CATEGORIES.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={category === group.id}
                onClick={() => setCategory(group.id)}
              >
                {group.title}
                <span aria-hidden="true">
                  {
                    FAQ_ITEMS.filter((item) => item.category === group.id)
                      .length
                  }
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className={styles.answers} aria-label="FAQ answers">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={styles.count}
          >
            {results.length} {results.length === 1 ? "answer" : "answers"}
            {searching ? " matching your search" : " to explore"}
          </p>
          <div id="faq-results">
            {results.length ? (
              results.map((item) => (
                <details
                  className={styles.question}
                  key={category + ":" + query + ":" + item.id}
                  open={searching || undefined}
                  data-faq-id={item.id}
                >
                  <summary>
                    {item.question}
                    <span aria-hidden="true" className={styles.expand} />
                  </summary>
                  <div className={styles.answer}>
                    <p>{item.answer}</p>
                    {item.link &&
                      (item.link.href === "/#contact-us" ? (
                        <SectionAnchor href="#ask-question">
                          Ask a question →
                        </SectionAnchor>
                      ) : item.link.href === "/consultation" &&
                        item.link.label.toLowerCase() ===
                          "get your free assessment" ? (
                        <AssessmentLink arrow />
                      ) : (
                        <Link href={item.link.href} prefetch={false}>
                          {item.link.label} →
                        </Link>
                      ))}
                  </div>
                </details>
              ))
            ) : (
              <div className={styles.empty}>
                <h2>No matching questions.</h2>
                <p>Try a shorter keyword or choose another topic.</p>
                <button type="button" onClick={clear}>
                  Reset search & topics
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
