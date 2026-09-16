import type { Metadata } from "next";
import { DeferredHomepageContact } from "@/components/deferred-homepage-contact";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FaqDirectory } from "./faq-directory";
import styles from "./faq.module.css";
import { faqMetadata } from "@/lib/region-seo";

export const metadata: Metadata = faqMetadata();

export default function FaqPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <div className={styles.main}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>A LITTLE CLARITY GOES A LONG WAY</p>
            <h1>Frequently asked questions.</h1>
            <p>
              From your first electricity bill to your next step with solar.
              Find the answers you need.
            </p>
          </div>
          <FaqDirectory />
        </div>
        <div className="tailwind-scope">
          <DeferredHomepageContact variant="question" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
