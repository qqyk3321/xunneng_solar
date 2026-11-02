import { canManage } from "@/lib/native-consultation/management";
import { EmailAssessment } from "@/components/native-consultation/email-access";
import { ReferenceValue } from "@/components/native-consultation/reference-value";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

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
  const editable = submission.consultation_id ? await canManage(submission.consultation_id) : false;
  const timing = submissionTiming(submission.submitted_at, country);
  const estimate = await loadCurrentConsultationEstimate(submission);
  const customerUrl = siteUrl(`/${region}/submission/${token}`);
  const whatsappUrl = consultationWhatsAppUrl(submission.submission_id, process.env.WHATSAPP_BASE_URL || undefined);
  const [previewQrSrc, whatsappQrSrc] = await Promise.all([qrDataUrl(customerUrl, QRCode, PNG), qrDataUrl(whatsappUrl, QRCode, PNG)]);
  return (
    <ConsultationContactProvider value={{ url: whatsappUrl, qrSrc: whatsappQrSrc, submissionId: submission.submission_id }}>
    <div className={styles.page} data-soft-enter="true">
      <RefreshOnReturn />
      <SiteHeader variant="form" />
      <main className={styles.content}>
        <header className={styles.pageHeading}><h1>Your assessment</h1></header>
        <div className={styles.quoteSection}>
          <CurrentEstimate estimate={estimate} />
        </div>
        <aside id="submission-overview" className={styles.sidebar} aria-label="Contact and submission details">
          <SubmissionContactActions previewUrl={customerUrl} previewQrSrc={previewQrSrc} whatsappUrl={whatsappUrl} whatsappQrSrc={whatsappQrSrc} />
          <section className={styles.summary} aria-labelledby="preview-title">
            <div className={styles.summaryBody}>
              <h2 id="preview-title" className={styles.srOnly}>Your submission</h2>
              <div className={styles.timeline}>
                <dl>
                  <div className={styles.nativeReference}>
                    <dt>Submission ID</dt>
                    <dd><ReferenceValue value={submission.submission_id} /></dd>
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
                </dl>
              </div>
            </div>
          </section>
        </aside>
        <div className={styles.results}>
          <EmailAssessment submission={submission} token={token} editable={editable} />
        </div>
      </main>
      <SiteFooter />
    </div>
    </ConsultationContactProvider>
  );
}
