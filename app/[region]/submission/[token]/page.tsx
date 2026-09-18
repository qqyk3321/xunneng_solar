import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmissionPreviewFrame } from "@/components/submission-preview-frame";
import { tallyPreviewUrl } from "@/lib/tally-preview-url";
import { submissionTiming } from "@/lib/submission-timing";
import { DeferredFloatingContact } from "@/components/deferred-floating-contact";
import { loadConsultationPreview } from "@/lib/consultation-preview";
import { countryFromSlug } from "@/lib/site-region-routing";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ConsultationPreviewPage({
  params,
}: {
  params: Promise<{ region: string; token: string }>;
}) {
  const { region, token } = await params;
  const country = countryFromSlug(region);
  const submission = await loadConsultationPreview(token);
  if (!country || !submission || submission.country_code !== country)
    notFound();
  const previewUrl = tallyPreviewUrl(submission.preview_url);
  const timing = submissionTiming(submission.submitted_at, country);
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.content}>
        <section className={styles.summary} aria-labelledby="preview-title">
          <ol className={styles.steps} aria-label="Submission progress">
            {["Privacy", "Your details", "Complete"].map((label, index) => (
              <li key={label}>
                <span className={styles.stepCheck} aria-hidden="true">
                  ✓
                </span>
                <span>
                  {index + 1}. {label}
                  <span className={styles.srOnly}> — completed</span>
                </span>
              </li>
            ))}
          </ol>
          <div className={styles.summaryBody}>
            <div className={styles.message}>
              <span className={styles.completeLabel}>ALL STEPS COMPLETE</span>
              <h1 id="preview-title">
                Your submission
                <br />
                is complete<span className={styles.dot}>.</span>
              </h1>
              <p>
                Thank you for sharing your plans. Our engineering team will
                review your home’s energy needs and prepare your next steps.
              </p>
              <p className={styles.replyNote}>
                We aim to get back to you within 48 hours.
              </p>
            </div>
            <div className={styles.timeline}>
              <dl>
                <div className={styles.reference}>
                  <dt>Submission ID</dt>
                  <dd>{submission.submission_id}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>
                    {timing ? (
                      <time dateTime={timing.submitted.iso}>
                        {timing.submitted.date}{" "}
                        <span>{timing.submitted.time}</span>
                      </time>
                    ) : (
                      "Time unavailable"
                    )}
                  </dd>
                </div>
                <div className={styles.response}>
                  <dt>Expected reply by</dt>
                  <dd>
                    {timing ? (
                      <time dateTime={timing.response.iso}>
                        {timing.response.date}{" "}
                        <span>{timing.response.time}</span>
                      </time>
                    ) : (
                      "Within 48 hours of submission"
                    )}
                  </dd>
                </div>
              </dl>
              <p>
                {country === "AG" ? "Antigua & Barbuda" : "Dominica"} local time
                · AST (UTC−4)
              </p>
            </div>
          </div>
        </section>
        {previewUrl ? (
          <SubmissionPreviewFrame previewUrl={previewUrl} />
        ) : (
          <section className={styles.card} role="status">
            <h2>Your preview is not available yet.</h2>
            <p>Please contact our team using the question button below.</p>
          </section>
        )}
      </main>
      <SiteFooter />
      <DeferredFloatingContact initialEmail={submission.email} />
    </div>
  );
}
