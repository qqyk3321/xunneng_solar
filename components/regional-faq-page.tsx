import { DeferredHomepageContact } from "@/components/deferred-homepage-contact";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FaqDirectory } from "@/app/faq/faq-directory";
import styles from "@/app/faq/faq.module.css";
import { getFaqItems } from "@/lib/faq/content";
import { requireRegion, type RegionPageProps } from "@/lib/region-seo";
import Link from "next/link";
import { regionPath } from "@/lib/site-region-routing";

export default async function FaqPage({ params }: RegionPageProps) {
  const country = await requireRegion(params);
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <div className={styles.main}>
          <div className={styles.intro}>
            <h1>Frequently asked questions.</h1>
            <p>
              From your first electricity bill to your next step with solar.
              Find the answers you need.
            </p>
            <p>
              <Link href={regionPath(country, "/how-it-works")}>
                See how solar, battery and grid work together →
              </Link>
            </p>
          </div>
          <FaqDirectory key={country} items={getFaqItems(country)} />
        </div>
        <div className="tailwind-scope">
          <DeferredHomepageContact variant="question" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
