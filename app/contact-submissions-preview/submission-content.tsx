/* eslint-disable @next/next/no-img-element -- Signed URLs for legacy private attachments. */
import { InquiryRichContent } from "@/components/inquiry-rich-content";
import {
  formatLabel,
  formatTime,
  type SubmissionPreviewData,
} from "@/lib/contact-submissions-preview/model";
import styles from "./preview.module.css";

/** One renderer for both the standalone page and the modal preview. */
export function SubmissionContent({ saved }: { saved: SubmissionPreviewData }) {
  return (
    <>
      <section className={styles.card} aria-label="Saved submission">
        <dl className={styles.metadata}>
          <div>
            <dt>Email address</dt>
            <dd data-testid="saved-email">{saved.submission.email}</dd>
          </div>
          <div>
            <dt>Submitted at (UTC)</dt>
            <dd>
              <time dateTime={saved.submission.createdAt}>
                {formatTime(saved.submission.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>{formatLabel(saved.submission.format)}</dd>
          </div>
          <div className={styles.reference}>
            <dt>Submission reference</dt>
            <dd>{saved.submission.id}</dd>
          </div>
        </dl>
        {saved.missingImages > 0 && (
          <p className={styles.imageWarning} role="alert">
            {saved.missingImages}{" "}
            {saved.missingImages === 1 ? "photo is" : "photos are"} temporarily
            unavailable. Your message is still shown below. Refresh to try
            again.
          </p>
        )}
        <article aria-label="Saved message" className={styles.document}>
          {saved.submission.displayFormat === "rich" ? (
            <InquiryRichContent
              content={saved.submission.content}
              imageUrls={saved.imageUrls}
              language="en"
            />
          ) : (
            <>
              <div className={styles.plain}>{saved.submission.message}</div>
              {saved.submission.photos.length > 0 && (
                <div className={styles.legacyPhotos}>
                  {saved.submission.photos.map((photo, index) =>
                    saved.imageUrls[photo.id] ? (
                      <img
                        key={photo.id}
                        src={saved.imageUrls[photo.id]}
                        alt={`Attached photo ${index + 1}`}
                      />
                    ) : (
                      <p key={photo.id}>Photo {index + 1} unavailable.</p>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </article>
      </section>
      {saved.submission.photos.length > 0 && (
        <p className={styles.hint}>
          Private photo links last for one hour. Refresh this preview to renew
          them; saved files are not deleted.
        </p>
      )}
    </>
  );
}
