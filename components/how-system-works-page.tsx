import Link from "next/link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AssessmentLink } from "./assessment-link";
import { HybridEnergyDemo } from "./hybrid-energy-demo";
import type { ServiceCountry } from "@/lib/consultation-intake";
import { regionPath } from "@/lib/site-region-routing";
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
          <Link href={regionPath(country)} className={styles.back}>
            ← Back to home
          </Link>
          <h1>
            One system.
            <br />
            <em>More ways to power your home.</em>
          </h1>
          <p>
            Use more sunshine. Buy less grid electricity. Plan backup for island
            life.
          </p>
        </div>
        <HybridEnergyDemo />
        <section className={styles.faq} aria-labelledby="energy-questions">
          <div className={styles.faqHeading}>
            <h2 id="energy-questions">A few useful answers.</h2>
            <Link href={regionPath(country, "/faq")}>Explore all FAQs →</Link>
          </div>
          {questions.map((item) => (
            <details
              key={item.id}
              className={styles.question}
              data-hybrid-faq={item.id}
            >
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
              {item.link && <a href={item.link.href}>{item.link.label} →</a>}
            </details>
          ))}
        </section>
        <section className={styles.next}>
          <div>
            <h2>What would work for your home?</h2>
            <p>Let’s plan around your electricity use and backup priorities.</p>
          </div>
          <AssessmentLink className={styles.cta} />
        </section>
      </main>
      <SiteFooter caribbean={!country} />
    </div>
  );
}
