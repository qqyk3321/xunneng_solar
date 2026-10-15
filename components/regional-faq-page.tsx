import { DeferredHomepageContact } from "@/components/deferred-homepage-contact";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FaqDirectory } from "@/app/faq/faq-directory";
import styles from "@/app/faq/faq.module.css";
import { getFaqItems } from "@/lib/faq/content";
import { requireRegion, type RegionPageProps } from "@/lib/region-seo";

export default async function FaqPage({ params }: RegionPageProps) {
  const country = await requireRegion(params);
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <div className={styles.main}>
          <div className={styles.intro}>
            <h1>
              <span className={styles.desktopTitle}>Frequently asked questions</span>
              <span className={styles.mobileTitle}>FAQs</span>
            </h1>
          </div>
          <FaqDirectory key={country} items={getFaqItems(country)} />
        </div>
        <div className={`tailwind-scope ${styles.contactSection}`}>
          <DeferredHomepageContact variant="question" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
