import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmissionPreviewFrame } from "@/components/submission-preview-frame";
import { tallyPreviewUrl } from "@/lib/tally-preview-url";
import { submissionTiming } from "@/lib/submission-timing";
import { loadConsultationPreview } from "@/lib/consultation-preview";
import { countryFromSlug } from "@/lib/site-region-routing";
import { loadCurrentConsultationEstimate } from "@/lib/quote-pricing/consultation-estimate";
import { CurrentEstimate } from "./estimate";
import { RefreshOnReturn } from "./refresh-on-return";
import { SubmissionContactActions } from "./contact-actions";
import { ConsultationContactProvider } from "@/components/whatsapp-contact";
import { consultationWhatsAppUrl } from "@/supabase/functions/_shared/whatsapp";
import { qrDataUrl } from "@/supabase/functions/_shared/consultation-qr";
import { siteUrl } from "@/lib/region-seo";
import QRCode from "qrcode";
import { PNG } from "pngjs";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
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
  const estimate = await loadCurrentConsultationEstimate(submission);
  const customerUrl = siteUrl(`/${region}/submission/${token}`);
  const whatsappUrl = consultationWhatsAppUrl(submission.submission_id, process.env.WHATSAPP_BASE_URL || undefined);
  const [previewQrSrc, whatsappQrSrc] = await Promise.all([qrDataUrl(customerUrl, QRCode, PNG), qrDataUrl(whatsappUrl, QRCode, PNG)]);
  const profileLabels = { daytime: "Daytime use", rush: "Daytime peak", evening: "Evening peak", night: "Nighttime peak" };
  const profileLabel = submission.consumption_profile ? profileLabels[submission.consumption_profile] : null;
  return (
    <ConsultationContactProvider value={{ url: whatsappUrl, qrSrc: whatsappQrSrc, submissionId: submission.submission_id }}>
    <div className={styles.page}>
      <RefreshOnReturn />
      <SiteHeader />
      <main className={styles.content}>
        <div className={styles.quoteSection}>
          <CurrentEstimate estimate={estimate} />
        </div>
        <aside id="submission-overview" className={styles.sidebar} aria-label="Contact and submission details">
          <SubmissionContactActions previewUrl={customerUrl} previewQrSrc={previewQrSrc} whatsappUrl={whatsappUrl} whatsappQrSrc={whatsappQrSrc} />
          <section className={styles.summary} aria-labelledby="preview-title">
            <div className={styles.summaryBody}>
              <h1 id="preview-title" className={styles.srOnly}>Your submission</h1>
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
                  <div>
                    <dt>Electricity use pattern</dt>
                    <dd data-testid="submission-energy-profile">{profileLabel || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Monthly electricity use</dt>
                    <dd data-testid="submission-monthly-kwh">{submission.monthly_kwh !== null && Number.isFinite(submission.monthly_kwh)
                      ? `${submission.monthly_kwh.toLocaleString("en-US", { maximumFractionDigits: 2 })} kWh`
                      : "Not provided"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        </aside>
        <div className={styles.results}>
          {previewUrl ? (
            <SubmissionPreviewFrame previewUrl={previewUrl} />
          ) : (
            <section className={styles.card} role="status">
              <h2>Your preview is not available yet.</h2>
              <p>Please contact our team using the contact details on this page.</p>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
    </ConsultationContactProvider>
  );
}
