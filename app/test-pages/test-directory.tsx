"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native new-tab links deliberately avoid route prefetching. */

import { useMemo, useState } from "react";
import { ArrowUpRight, FlaskConical, Search, ShieldAlert } from "lucide-react";
import {
  TEST_GROUPS,
  TEST_PAGES,
  filterTestPages,
  type TestGroup,
} from "@/lib/test-pages/catalog";
import styles from "./test-pages.module.css";

const externalTab = { target: "_blank", rel: "noopener noreferrer" } as const;
export function TestDirectory() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<TestGroup | "all">("all");
  const entries = useMemo(() => filterTestPages(query, group), [query, group]);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>Sol &amp; Tide Energy</span>
        <span className={styles.badge}>
          <FlaskConical size={14} aria-hidden="true" />
          Development only
        </span>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>LOCAL EXPERIMENT ARCHIVE</p>
          <h1>Test pages, all in one place.</h1>
          <p>
            Archived prototypes and private review tools. Available locally
            only; all experiment pages and their APIs are disabled online.
          </p>
        </div>
        <aside className={styles.notice}>
          <ShieldAlert size={20} aria-hidden="true" />
          <div>
            <strong>Navigation only — nothing is run in advance.</strong>
            <p>
              Pages open in a new tab only when clicked. Message review tools
              may contain real customer data. Keep this development server on a
              trusted network and use sample data when testing new submissions.
            </p>
          </div>
        </aside>
        <section className={styles.mainLinks} aria-label="Main business pages">
          <div>
            <strong>Main business pages</strong>
            <span>
              Live features: homepage, calculator, Contact us, FAQ questions and
              consultation. Existing customer result links remain available.
            </span>
          </div>
          <div>
            <a href="/" {...externalTab}>
              Homepage
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <a href="/consultation" {...externalTab}>
              Consultation
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <a href="/faq" {...externalTab}>
              FAQ
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <a href="/#contact-us" {...externalTab}>
              Contact us
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </section>
        <div className={styles.controls}>
          <label className={styles.search}>
            <Search size={19} aria-hidden="true" />
            <span className={styles.srOnly}>Search test pages</span>
            <input
              type="search"
              placeholder="Search by feature, page name or route…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            className={styles.filters}
            role="group"
            aria-label="Filter by category"
          >
            <button
              type="button"
              aria-pressed={group === "all"}
              onClick={() => setGroup("all")}
            >
              All pages
            </button>
            {TEST_GROUPS.map((category) => (
              <button
                type="button"
                key={category.id}
                aria-pressed={group === category.id}
                onClick={() => setGroup(category.id)}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>
        <p className={styles.count} role="status">
          Showing {entries.length} of {TEST_PAGES.length} registered pages
        </p>
        <div className={styles.directory}>
          {TEST_GROUPS.map((category) => {
            const pages = entries.filter((page) => page.group === category.id);
            if (!pages.length) return null;
            return (
              <section
                key={category.id}
                className={styles.group}
                aria-labelledby={`group-${category.id}`}
              >
                <div className={styles.groupHeading}>
                  <h2 id={`group-${category.id}`}>
                    {category.title}
                    <span>{pages.length}</span>
                  </h2>
                  <p>{category.description}</p>
                </div>
                <div className={styles.grid}>
                  {pages.map((page) => (
                    <article
                      key={page.route}
                      className={styles.card}
                      data-test-route={page.route}
                    >
                      <span className={styles.access}>{page.access}</span>
                      <h3>{page.title}</h3>
                      <code className={styles.route}>{page.route}</code>
                      <p className={styles.description}>{page.description}</p>
                      {page.notice && (
                        <p className={styles.cardNotice}>{page.notice}</p>
                      )}
                      <div className={styles.actions}>
                        <a
                          className={styles.openButton}
                          href={page.href}
                          aria-label={`${page.action ?? "Open page"}: ${page.title} (new tab)`}
                          {...externalTab}
                        >
                          {page.action ?? "Open page"}
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </a>
                        {page.shortcuts && (
                          <div className={styles.shortcuts}>
                            {page.shortcuts.map((shortcut) => (
                              <a
                                key={shortcut.href}
                                href={shortcut.href}
                                {...externalTab}
                              >
                                {shortcut.title}
                                <ArrowUpRight size={12} aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          {!entries.length && (
            <section className={styles.empty}>
              <h2>No matching test pages</h2>
              <p>
                Try another name, route or keyword. Chinese feature keywords
                work too.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setGroup("all");
                }}
              >
                Clear filters
              </button>
            </section>
          )}
        </div>
        <footer className={styles.footer}>
          <p>
            Bookmark <code>/test-pages</code> as your starting point.
          </p>
          <p>
            New experiments are registered in{" "}
            <code>lib/test-pages/catalog.ts</code>. API endpoints and email
            callbacks are intentionally not navigation links.
          </p>
        </footer>
      </main>
    </div>
  );
}
