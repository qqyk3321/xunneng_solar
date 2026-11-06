import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { HybridEnergyDemo } from "./hybrid-energy-demo";
import { AssessmentLink } from "./assessment-link";
import type { ServiceCountry } from "@/lib/consultation-intake";
import { getFaqItems } from "@/lib/faq/content";
import { HYBRID_FAQS, HYBRID_FEATURED_FAQ_IDS } from "@/lib/faq/hybrid";
import { HYBRID_FAQ_SCENE_IDS } from "@/lib/hybrid-scenes";
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
          <p className={styles.introDescription}>Hybrid systems support a range of operating modes. Here, we explain four common everyday scenarios. Other modes depend on your equipment and settings.</p>
          <a className={styles.watchLink} href="#overview-video">Watch the 38-second video <span aria-hidden="true">→</span></a>
        </div>
        <HybridEnergyDemo />
        <section id="overview-video" className={styles.videoSection} aria-label="Hybrid solar video and free assessment">
          <div className={styles.videoCopy}>
            <p>See how solar, battery storage and the grid work together to power your home throughout the day.</p>
            <p>Your electricity use, daily routine and roof help shape the right system for your home.</p>
            <div className={styles.videoActions}>
              <AssessmentLink country={country} className={styles.videoAssessment} />
              <a className={styles.facebookLink} href="https://www.facebook.com/reel/4465900056958300/" target="_blank" rel="noopener noreferrer">
                Watch on Facebook <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className={styles.videoPlayer}>
            <iframe
              className={styles.video}
              src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F4465900056958300%2F&width=360&show_text=false"
              title="Sol & Tide: How hybrid solar powers your home"
              width="360"
              height="640"
              loading="lazy"
              scrolling="no"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>
        <section className={styles.faq} aria-labelledby="energy-questions">
          <div className={styles.faqHeading}>
            <h2 id="energy-questions">Common questions</h2>
          </div>
          {questions.map((item) => (
            <details
              key={item.id}
              id={HYBRID_FAQ_SCENE_IDS.some(id => item.id === `hybrid-${id}`) ? `scene-${item.id.replace(/^hybrid-/, "")}` : undefined}
              className={styles.question}
              data-hybrid-faq={item.id}
            >
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      </main>
      <SiteFooter caribbean={!country} />
    </div>
  );
}
