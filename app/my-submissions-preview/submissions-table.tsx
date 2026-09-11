"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import {
  formatSubmissionTime,
  sortSubmissions,
  type SubmissionSort,
  type SubmissionSummary,
} from "@/lib/account-submissions/model";
import styles from "./submissions.module.css";

export function RefreshSubmissions() {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  return (
    <button
      className={styles.button}
      disabled={busy}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw size={16} aria-hidden="true" />
      {busy ? "Refreshing…" : "Refresh"}
    </button>
  );
}

export function SubmissionsTable({ rows }: { rows: SubmissionSummary[] }) {
  const [sort, setSort] = useState<SubmissionSort>({
    column: "receivedAt",
    direction: "desc",
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const sorted = useMemo(() => sortSubmissions(rows, sort), [rows, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = sorted.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  function changeSort(column: SubmissionSort["column"]) {
    setSort({
      column,
      direction:
        sort.column === column && sort.direction === "asc" ? "desc" : "asc",
    });
    setPage(0);
  }
  const sortHeader = (column: SubmissionSort["column"], title: string) => (
    <th
      scope="col"
      aria-sort={
        sort.column === column
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button className={styles.sort} onClick={() => changeSort(column)}>
        {title}
        {sort.column === column &&
          (sort.direction === "asc" ? (
            <ArrowUp size={14} aria-hidden="true" />
          ) : (
            <ArrowDown size={14} aria-hidden="true" />
          ))}
      </button>
    </th>
  );
  return (
    <section className={styles.card} aria-label="Your submissions">
      <div className={styles.tableHeading}>
        <div>
          <h2>Submission history</h2>
          <p>
            {rows.length} {rows.length === 1 ? "submission" : "submissions"}{" "}
            linked to your email
          </p>
        </div>
        <RefreshSubmissions />
      </div>
      {!rows.length ? (
        <div className={styles.empty}>
          <ClipboardList size={36} aria-hidden="true" />
          <h3>No submissions yet</h3>
          <p>
            There are no submissions linked to this account’s email. If you
            submitted using a different email, sign in with that email to view
            them.
          </p>
        </div>
      ) : (
        <>
          <div
            className={styles.tableScroll}
            tabIndex={0}
            role="region"
            aria-label="Submission table — scroll horizontally on small screens"
          >
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                All submissions for your account. Sort by submission time or
                location. Times are shown in UTC.
              </caption>
              <thead>
                <tr>
                  {sortHeader("receivedAt", "Submitted at")}
                  {sortHeader("location", "Submission location")}
                  <th scope="col">Preview</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <time
                        dateTime={
                          row.receivedAt &&
                          Number.isFinite(Date.parse(row.receivedAt))
                            ? row.receivedAt
                            : undefined
                        }
                      >
                        {formatSubmissionTime(row.receivedAt)}
                      </time>
                      <small>Record #{row.id}</small>
                    </td>
                    <td className={styles.location}>
                      {row.location ?? "Location not provided"}
                    </td>
                    <td>
                      {row.previewHref ? (
                        <a
                          className={styles.previewLink}
                          href={row.previewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Preview submission ${row.id} (opens in a new tab)`}
                        >
                          View preview
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </a>
                      ) : (
                        <span className={styles.unavailable}>
                          Preview unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span aria-live="polite">
              {currentPage * pageSize + 1}–
              {Math.min((currentPage + 1) * pageSize, rows.length)} of{" "}
              {rows.length}
            </span>
            <nav aria-label="Submission pages">
              <button
                className={styles.button}
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage + 1} of {pages}
              </span>
              <button
                className={styles.button}
                disabled={currentPage + 1 >= pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          </div>
        </>
      )}
    </section>
  );
}
