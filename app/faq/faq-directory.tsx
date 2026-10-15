"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { AssessmentLink } from "@/components/assessment-link";
import { SectionAnchor } from "@/components/section-anchor";
import {
  FAQ_CATEGORIES,
  searchFaq,
  type FaqCategory,
  type FaqItem,
} from "@/lib/faq/content";
import styles from "./faq.module.css";

export function FaqDirectory({ items }: { items: FaqItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const search = useRef<HTMLInputElement>(null);
  const searchArea = useRef<HTMLDivElement>(null);
  const results = searchFaq(query, category, items);
  const searching = query.trim().length > 0;
  function selectCategory(next: FaqCategory | "all") {
    const bringResultsIntoView =
      window.matchMedia("(min-width: 1001px)").matches &&
      searchArea.current &&
      searchArea.current.getBoundingClientRect().top < 112;
    setCategory(next);
    if (bringResultsIntoView) {
      requestAnimationFrame(() => {
        searchArea.current?.scrollIntoView({ block: "start", behavior: "instant" });
      });
    }
  }
  function clear() {
    setQuery("");
    setCategory("all");
    search.current?.focus();
  }
  return (
    <>
      <div ref={searchArea} className={styles.searchArea} role="search" aria-label="FAQ search">
        <label htmlFor="faq-search">Search the FAQ</label>
        <div className={styles.searchField}>
          <Search size={20} className={styles.searchIcon} aria-hidden="true" />
          <input
            ref={search}
            id="faq-search"
            type="search"
            autoComplete="off"
            placeholder="Search questions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-controls="faq-results"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
            >
              <span className={styles.clearText}>Clear search</span>
              <X size={18} className={styles.clearIcon} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className={styles.workspace}>
        <aside className={styles.topics} aria-label="FAQ topics">
          <h2>Browse by topic</h2>
          <div className={styles.topicPicker}>
            <label htmlFor="faq-topic">Topic</label>
            <select
              id="faq-topic"
              value={category}
              aria-controls="faq-results"
              onChange={(event) => selectCategory(event.target.value as FaqCategory | "all")}
            >
              <option value="all">All questions</option>
              {FAQ_CATEGORIES.map((group) => (
                <option key={group.id} value={group.id}>{group.title}</option>
              ))}
            </select>
          </div>
          <div className={styles.topicButtons} role="group" aria-label="Filter questions by topic">
            <button
              type="button"
              aria-pressed={category === "all"}
              onClick={() => selectCategory("all")}
            >
              All questions <span aria-hidden="true">{items.length}</span>
            </button>
            {FAQ_CATEGORIES.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={category === group.id}
                onClick={() => selectCategory(group.id)}
              >
                {group.title}
                <span aria-hidden="true">
                  {
                    items.filter((item) => item.category === group.id)
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
            className={`${styles.count} ${searching ? "" : styles.idleCount}`}
          >
            {results.length} {results.length === 1 ? "answer" : "answers"}
            <span className={styles.mobileOnly}>
              {searching ? " matching your search" : " to explore"}
            </span>
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
                    <p style={{ whiteSpace: "pre-line" }}>{item.answer}</p>
                    {item.link &&
                      (item.link.href === "#ask-question" ? (
                        <SectionAnchor href="#ask-question" className={styles.answerContactLink}>
                          Ask a question →
                        </SectionAnchor>
                      ) : item.id === "start-assessment" ? (
                        <AssessmentLink arrow />
                      ) : (
                        <Link href={item.link.href} prefetch={false}>
                          {item.link.label}<span className={styles.mobileOnly}> →</span>
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
