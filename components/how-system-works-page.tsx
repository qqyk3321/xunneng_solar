import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AssessmentLink } from "./assessment-link";
import { HybridEnergyDemo } from "./hybrid-energy-demo";
import type { ServiceCountry } from "@/lib/consultation-intake";
import { getFaqItems } from "@/lib/faq/content";
import { HYBRID_FAQS, HYBRID_FEATURED_FAQ_IDS } from "@/lib/faq/hybrid";
import styles from "./how-system-works-page.module.css";

export function HowSystemWorksPage({
  country = null,
}: {
  country?: ServiceCountry | null;
}) {
  const questions = (country ? getFaqItems(country) : HYBRID_FAQS).filter(
    (item) => HYBRID_FEATURED_FAQ_IDS.includes(item.id),
  );
  return (
    <div className={styles.page}>
      <SiteHeader caribbean={!country} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>
            <span className={styles.desktopTitle}>How your solar system works</span>
            <span className={styles.mobileTitle}>How solar works</span>
          </h1>
        </div>
        <HybridEnergyDemo />
        <section className={styles.faq} aria-labelledby="energy-questions">
          <div className={styles.faqHeading}>
            <h2 id="energy-questions">Common questions</h2>
          </div>
          {questions.map((item) => (
            <details
              key={item.id}
              className={styles.question}
              data-hybrid-faq={item.id}
            >
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
        <section className={styles.next}>
          <div>
            <h2>What would work for your home?</h2>
          </div>
          <AssessmentLink className={styles.cta} />
        </section>
      </main>
      <SiteFooter caribbean={!country} />
    </div>
  );
}
