import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmissionPreviewFrame } from "@/components/submission-preview-frame";
import { tallyPreviewUrl } from "@/lib/tally-preview-url";
import { HomeContact } from "@/components/home-contact";
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
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.content}>
        <section className={styles.hero}>
          <p>SUBMISSION RECEIVED</p>
          <h1>Your consultation is with our team.</h1>
          <span>We aim to reply within 48 hours.</span>
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
      <HomeContact initialEmail={submission.email} variant="floating" />
    </div>
  );
}
