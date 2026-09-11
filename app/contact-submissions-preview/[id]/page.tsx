import Link from "next/link";
import { notFound } from "next/navigation";
import { UUID_PATTERN } from "@/lib/anonymous-inquiry/config";
import { SubmissionContent } from "../submission-content";
import { DownloadMenu } from "../download-menu";
import { createContactReader } from "@/lib/contact-submissions-preview/server";
import {
  LIST_PATH,
  listHref,
  listOptions,
  listQuery,
  type SearchParams,
} from "@/lib/contact-submissions-preview/model";
import styles from "../preview.module.css";

export default async function ContactSubmissionPreview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const options = listOptions(await searchParams);
  let saved: Awaited<
    ReturnType<ReturnType<typeof createContactReader>["submission"]>
  > = null;
  let failed = false;
  try {
    saved = await createContactReader().submission(id);
  } catch {
    failed = true;
  }
  if (!failed && !saved) notFound();
  const refresh = `${LIST_PATH}/${id}?${listQuery(options)}`;
  return (
    <>
      <Link className={styles.back} href={listHref(options)}>
        ← Back to submissions
      </Link>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>SAVED MESSAGE</p>
          <h1>Submission preview</h1>
          <p>
            Read directly from the saved submission. No editing or resubmitting.
          </p>
        </div>
        <div className={styles.previewActions}>
          <a href={refresh} className={styles.button}>
            Refresh preview
          </a>
          <DownloadMenu id={id} />
        </div>
      </div>
      {failed || !saved ? (
        <section className={styles.card} role="alert">
          <h2>We couldn’t load this preview.</h2>
          <p>
            Please refresh and try again. The submission has not been changed.
          </p>
        </section>
      ) : (
        <SubmissionContent saved={saved} />
      )}
    </>
  );
}
