"use client";

import type { ReactNode } from "react";
import { RegionCertification, useSiteRegion } from "./site-region";
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
  const { country } = useSiteRegion();
  const hero =
    country === "AG"
      ? {
          eyebrow: "SOLAR + STORAGE · ANTIGUA HOMES",
          title: "The Renewable Energy Solution for Antigua",
          description:
            "Solar and battery solutions for your home in Antigua. Lower your electricity bills and plan for outages with an Antigua-based team, local parts stock and ongoing support.",
          support: "Local Parts Stock",
        }
      : country === "DM"
        ? {
            eyebrow: "SOLAR + STORAGE · DOMINICA HOMES",
            title: "The Renewable Energy Solution for the Caribbean Region",
            description:
          "Solar and battery solutions for your home in Dominica. Explore lower electricity bills and smarter backup, with equipment supply, installation and ongoing support coordinated by our local team.",
            support: "Serving Dominica",
          }
        : {
            eyebrow: "SOLAR + STORAGE · CARIBBEAN HOMES",
            title: "The Renewable Energy Solution for the Caribbean Region",
            description:
              "Solar and battery solutions for homes across the Caribbean. Currently serving Antigua and Dominica, with more locations to follow.",
            support: "Antigua + Dominica",
          };
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
              src={country === "DM" ? "/images/dominica-solar-hero.png" : "https://lh3.googleusercontent.com/aida-public/AB6AXuBO8sy9rZQu18XXsryGTTrzlndxDiumh3ZIr6_HGFb0DcAgM_kQLwfm2HCcSlYSEK2KMVb32NCfyojj6Mf5Ox7F6xc956zVNekFfnbf9GAVRbQ-HsdZ_Z4v29wdr73LB1AhcDsXqPbIEdlkCMnKGUze9dfjhpFXHUif06fcLtjSW6Nc1S4ZZwnfwWbFnC7jBzHLxaE5d0tE6vf7Yi2leAmbSMhmvfoT_t6tEeCwoKeuRhUl1noLnA77"}
              alt={country === "DM" ? "Illustrative solar-powered coastal homes inspired by Dominica" : "Solar-equipped coastal homes"}
              fetchPriority="high"
            />
          </div>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>{hero.eyebrow}</p>
            <h1 id="hero-title">{hero.title}</h1>
            <p className={styles.heroCopy}>{hero.description}</p>
            <div className={styles.heroActions}>
              <AssessmentLink className={styles.primary} />
              <SectionAnchor href="#calculator" className={styles.solarButton}>
                Get an Estimate
              </SectionAnchor>
            </div>
            <div className={styles.heroNotes}>
              <span>150+ MPH Rated</span>
              <span>
                <RegionCertification /> Certified Equipment
              </span>
              <span>{hero.support}</span>
              <span>8-Year Inverter Warranty</span>
              <span>LiFePO4 Battery · 4,000 Cycles</span>
              <span>15-Year Solar Panel Warranty</span>
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
