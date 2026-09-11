import type { ReactNode } from "react";
import { AssessmentLink } from "./assessment-link";
import { AntiguaSolarCalculator } from "./antigua-solar-calculator";
import { SectionAnchor } from "./section-anchor";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { SolarInstallation } from "./solar-installation";
import { WhyChooseUs } from "./why-choose-us";
import styles from "./demo-homepage.module.css";

export function DemoHomepage({
  accountSlot,
  contactSlot,
}: { accountSlot?: ReactNode; contactSlot?: ReactNode } = {}) {
  return (
    <div className={"demo-home tailwind-scope " + styles.homepage}>
      <SiteHeader homeSectionsLocal accountSlot={accountSlot} />
      <main className={styles.main}>
        <section
          className={styles.hero}
          aria-labelledby="hero-title"
          data-testid="home-hero"
        >
          <div className={styles.heroMedia}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Keep the existing homepage hero asset. */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBO8sy9rZQu18XXsryGTTrzlndxDiumh3ZIr6_HGFb0DcAgM_kQLwfm2HCcSlYSEK2KMVb32NCfyojj6Mf5Ox7F6xc956zVNekFfnbf9GAVRbQ-HsdZ_Z4v29wdr73LB1AhcDsXqPbIEdlkCMnKGUze9dfjhpFXHUif06fcLtjSW6Nc1S4ZZwnfwWbFnC7jBzHLxaE5d0tE6vf7Yi2leAmbSMhmvfoT_t6tEeCwoKeuRhUl1noLnA77"
              alt="Solar-equipped coastal homes in Antigua"
              fetchPriority="high"
            />
          </div>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>
              SOLAR + STORAGE · ANTIGUA HOMES
            </p>
            <h1 id="hero-title">
              Reliable Solar + Storage
              <br />
              for Antigua
            </h1>
            <p className={styles.heroCopy}>
              Put island sunshine to work. Explore lower electricity bills,
              battery backup and a system built around your home.
            </p>
            <div className={styles.heroActions}>
              <AssessmentLink className={styles.primary} />
              <SectionAnchor href="#calculator" className={styles.solarButton}>
                Get an Estimate
              </SectionAnchor>
            </div>
            <div className={styles.heroNotes}>
              <span>150+ MPH Rated</span>
              <span>UL Certified Equipment</span>
              <span>Local Parts Stock</span>
              <span>10-Year Inverter + Battery Warranty</span>
              <span>25-Year Solar Panel Warranty</span>
            </div>
          </div>
        </section>

        <section
          id="calculator"
          className={styles.calculatorSection}
          aria-labelledby="calculator-heading"
          tabIndex={-1}
        >
          <div className={styles.container}>
            <div className={styles.sectionIntro}>
              <div>
                <h2 id="calculator-heading">What could solar save you?</h2>
              </div>
              <p className={styles.context}>
                For homes in <strong>Antigua</strong>, using the APUA June 2026
                tariff. Slide your monthly bill to explore your options.
              </p>
            </div>
            <AntiguaSolarCalculator />
          </div>
        </section>

        <WhyChooseUs />

        <SolarInstallation />
        {contactSlot}
      </main>
      <SiteFooter />
    </div>
  );
}
