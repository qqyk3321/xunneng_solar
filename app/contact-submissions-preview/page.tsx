import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { createContactReader } from "@/lib/contact-submissions-preview/server";
import {
  LIST_PATH,
  PAGE_SIZES,
  formatLabel,
  formatTime,
  listHref,
  listOptions,
  listQuery,
  type SearchParams,
} from "@/lib/contact-submissions-preview/model";
import styles from "./preview.module.css";
import { ModalPreview } from "./modal-preview";
import { DownloadMenu } from "./download-menu";

export default async function ContactSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const requested = listOptions(await searchParams);
  let result: Awaited<
    ReturnType<ReturnType<typeof createContactReader>["list"]>
  > | null = null;
  try {
    result = await createContactReader().list(requested);
  } catch {
    /* Never show a failed read as an empty inbox. */
  }
  if (result && result.options.page !== requested.page)
    redirect(listHref(result.options));
  const options = result?.options ?? requested;
  function sortHeading(sort: "email" | "created_at", label: string) {
    const active = options.sort === sort;
    const direction = active && options.direction === "asc" ? "desc" : "asc";
    const Icon = active
      ? options.direction === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;
    return (
      <th
        scope="col"
        aria-sort={
          active
            ? options.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <Link
          href={listHref({ ...options, page: 1, sort, direction })}
          prefetch={false}
          aria-label={`Sort by ${label.toLowerCase()} ${direction === "asc" ? "ascending" : "descending"}`}
        >
          {label}
          <Icon size={15} aria-hidden="true" />
        </Link>
      </th>
    );
  }
  return (
    <>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>MESSAGE LIBRARY</p>
          <h1>Contact submissions</h1>
          <p>Every saved message, with its own read-only preview.</p>
        </div>
        <a className={styles.button} href={listHref(options)}>
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </a>
      </div>
      {!result ? (
        <section className={styles.card} role="alert">
          <h2>We couldn’t load the submissions.</h2>
          <p>
            Please refresh and try again. Your saved messages have not been
            changed.
          </p>
        </section>
      ) : (
        <section className={styles.tableCard} aria-label="Contact submissions">
          <div className={styles.tableTools}>
            <div>
              <strong data-testid="submission-count">
                {result.total}{" "}
                {result.total === 1 ? "submission" : "submissions"}
              </strong>
              <p>
                All saved anonymous inquiries, including earlier tests. Times
                shown in UTC.
              </p>
            </div>
            <form action={LIST_PATH} className={styles.sizeForm}>
              <input type="hidden" name="sort" value={options.sort} />
              <input type="hidden" name="direction" value={options.direction} />
              <label htmlFor="contact-page-size">Rows per page</label>
              <select
                id="contact-page-size"
                name="size"
                defaultValue={options.size}
                key={options.size}
              >
                {PAGE_SIZES.map((size) => (
                  <option value={size} key={size}>
                    {size}
                  </option>
                ))}
              </select>
              <button className={styles.button} type="submit">
                Apply
              </button>
            </form>
          </div>
          {result.total === 0 ? (
            <div className={styles.empty}>
              <Inbox size={32} aria-hidden="true" />
              <h2>No messages yet</h2>
              <p>
                Send a test message from Contact us, then refresh this page.
              </p>
              <Link className={styles.button} href="/home-preview#contact-us">
                Open Contact us
              </Link>
            </div>
          ) : (
            <>
              <div
                className={styles.tableScroll}
                tabIndex={0}
                role="region"
                aria-label="Scrollable submissions table"
              >
                <table className={styles.table}>
                  <caption className={styles.srOnly}>
                    Contact us submissions. Select a column heading to sort all
                    records.
                  </caption>
                  <thead>
                    <tr>
                      {sortHeading("email", "Email address")}
                      {sortHeading("created_at", "Submitted at")}
                      <th scope="col">Format</th>
                      <th scope="col">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.id} data-submission-id={row.id}>
                        <td className={styles.emailCell}>{row.email}</td>
                        <td>
                          <time dateTime={row.createdAt}>
                            {formatTime(row.createdAt)}
                          </time>
                          <span className={styles.timezone}>UTC</span>
                        </td>
                        <td>
                          <span className={styles.format}>
                            {formatLabel(row.format)}
                          </span>
                        </td>
                        <td>
                          <div className={styles.previewActions}>
                            <Link
                              className={styles.button}
                              href={`${LIST_PATH}/${row.id}?${listQuery(options)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              prefetch={false}
                              aria-label={`Preview submission from ${row.email} (opens in a new tab)`}
                            >
                              Preview
                              <ArrowUpRight size={15} aria-hidden="true" />
                            </Link>
                            <ModalPreview
                              id={row.id}
                              email={row.email}
                              pageHref={`${LIST_PATH}/${row.id}?${listQuery(options)}`}
                            />
                            <DownloadMenu id={row.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className={styles.pagination} aria-label="Submission pages">
                <span>
                  Showing {(options.page - 1) * options.size + 1}–
                  {(options.page - 1) * options.size + result.rows.length} of{" "}
                  {result.total}
                </span>
                <div>
                  {options.page > 1 ? (
                    <Link
                      className={styles.button}
                      prefetch={false}
                      href={listHref({ ...options, page: options.page - 1 })}
                    >
                      Previous
                    </Link>
                  ) : (
                    <button className={styles.button} disabled>
                      Previous
                    </button>
                  )}
                  <span aria-live="polite">
                    Page {options.page} of {result.pages}
                  </span>
                  {options.page < result.pages ? (
                    <Link
                      className={styles.button}
                      prefetch={false}
                      href={listHref({ ...options, page: options.page + 1 })}
                    >
                      Next
                    </Link>
                  ) : (
                    <button className={styles.button} disabled>
                      Next
                    </button>
                  )}
                </div>
              </nav>
            </>
          )}
        </section>
      )}
      <p className={styles.footer}>
        <Link href="/home-preview#contact-us">← Back to Contact us</Link>
        <span>
          Preview opens the saved record. It does not create or replace a
          submission.
        </span>
      </p>
    </>
  );
}
