import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { HomeContact } from "@/components/home-contact";
import { loadConsultationPreview } from "@/lib/consultation-preview";
import { countryFromSlug, regionPath } from "@/lib/site-region-routing";
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
  const address = submission.address as Record<string, string | null>;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href={regionPath(country)} className={styles.brand}>
          <BrandMark />
          Sol &amp; Tide Energy
        </Link>
        <Link href={regionPath(country)} className={styles.home}>
          Back to {country === "AG" ? "Antigua" : "Dominica"} home
        </Link>
      </header>
      <section className={styles.hero}>
        <p>SUBMISSION RECEIVED</p>
        <h1>Your consultation is with our team.</h1>
        <span>We aim to reply within 48 hours.</span>
      </section>
      <section className={styles.card}>
        <h2>Your submitted details</h2>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{submission.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{submission.email}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{submission.phone}</dd>
          </div>
          <div>
            <dt>Installation address</dt>
            <dd>
              {[address.building, address.street, address.town, address.parish]
                .filter(Boolean)
                .join(", ")}
            </dd>
          </div>
        </dl>
      </section>
      <HomeContact initialEmail={submission.email} variant="floating" />
    </main>
  );
}
