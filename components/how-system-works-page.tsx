import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { HybridEnergyDemo } from "./hybrid-energy-demo";
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
          <a className={styles.watchLink} href="#overview-video">Watch the 38-second video <span aria-hidden="true">→</span></a>
        </div>
        <HybridEnergyDemo />
        <section id="overview-video" className={styles.videoSection} aria-labelledby="overview-video-title">
          <div className={styles.videoCopy}>
            <span className={styles.videoEyebrow}>A day with hybrid solar</span>
            <h2 id="overview-video-title">See the whole day in 38 seconds.</h2>
            <p>Follow the same system through sunshine, cloud cover and evening use, then see how the grid steps in when the battery reaches its reserve.</p>
            <p className={styles.videoLanguage}>English narration and captions</p>
            <details className={styles.transcript}>
              <summary>Read the transcript</summary>
              <p>What powers your home, day and night?</p>
              <p>On sunny days, solar powers your home and stores surplus energy in the battery.</p>
              <p>When clouds reduce solar output, the grid fills the gap. In this setup, the battery stays idle.</p>
              <p>After sunset, the battery powers your home using energy stored during the day.</p>
              <p>At the battery’s reserve level, discharge stops. An available grid takes over, preserving the remaining charge.</p>
            </details>
          </div>
          <video
            className={styles.video}
            controls
            playsInline
            preload="none"
            poster="/videos/hybrid-day-night-v1.jpg"
            aria-label="How hybrid solar powers your home through four everyday scenes"
          >
            <source src="/videos/hybrid-day-night-v1.mp4" type="video/mp4" />
            <track kind="captions" src="/videos/hybrid-day-night-v1.vtt" srcLang="en" label="English" />
            Your browser does not support this video. <a href="/videos/hybrid-day-night-v1.mp4">Watch the video</a>.
          </video>
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
