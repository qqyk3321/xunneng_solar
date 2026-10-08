import type { ReactNode } from "react";
import Image from "next/image";
import type { ServiceCountry } from "@/lib/consultation-intake";
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
  immersive = false,
  country = null,
}: {
  accountSlot?: ReactNode;
  contactSlot?: ReactNode;
  immersive?: boolean;
  country?: ServiceCountry | null;
} = {}) {
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
    <div
      className={"demo-home tailwind-scope " + styles.homepage}
      data-immersive={immersive || undefined}
    >
      <SiteHeader
        homeSectionsLocal
        accountSlot={accountSlot}
        immersive={immersive}
      />
      <main className={styles.main}>
        <section
          className={styles.hero}
          aria-labelledby="hero-title"
          data-testid="home-hero"
          data-country={country ?? undefined}
        >
          <div className={styles.heroMedia}>
            <Image
              src={
                country === "AG"
                  ? "/images/antigua-solar-map-hero-no-labels.webp"
                  : country === "DM"
                    ? "/images/dominica-solar-map-hero-no-labels.webp"
                    : "https://lh3.googleusercontent.com/aida-public/AB6AXuBO8sy9rZQu18XXsryGTTrzlndxDiumh3ZIr6_HGFb0DcAgM_kQLwfm2HCcSlYSEK2KMVb32NCfyojj6Mf5Ox7F6xc956zVNekFfnbf9GAVRbQ-HsdZ_Z4v29wdr73LB1AhcDsXqPbIEdlkCMnKGUze9dfjhpFXHUif06fcLtjSW6Nc1S4ZZwnfwWbFnC7jBzHLxaE5d0tE6vf7Yi2leAmbSMhmvfoT_t6tEeCwoKeuRhUl1noLnA77"
              }
              fill
              priority
              quality={78}
              sizes="100vw"
              className={country === "AG" ? styles.antiguaHero : undefined}
              alt={
                country === "AG"
                  ? "Antigua-inspired solar home and turquoise bay with Antigua and Barbuda island silhouettes blended into the sea; artistic illustration"
                  : country === "DM"
                    ? "Dominica-inspired rainforest coast and solar home with the island silhouette blended into the background; artistic illustration"
                    : "Solar-equipped coastal homes"
              }
            />
          </div>
          <div className={styles.heroContent}>
            {country ? (
              <div className={styles.islandHeading}>
                <h1 id="hero-title">
                  {country === "AG" ? "Antigua & Barbuda" : "Dominica"}
                </h1>
                <p>Brighter homes. A cleaner tomorrow.</p>
              </div>
            ) : (
              <>
                <p className={styles.heroEyebrow}>{hero.eyebrow}</p>
                <h1 id="hero-title">{hero.title}</h1>
              </>
            )}
            <div className={styles.heroDetails}>
              {country && (
                <h2 className={styles.islandPromise}>
                  Clean energy.
                  <br />A brighter island home.
                </h2>
              )}
              <p className={styles.heroCopy}>
                {country
                  ? "Solar and battery storage for lower bills and smarter backup. Locally supported, from planning to installation and beyond."
                  : hero.description}
              </p>
              <div className={styles.heroActions}>
                <AssessmentLink country={country} className={styles.primary} />
                <SectionAnchor
                  href="#calculator"
                  className={styles.solarButton}
                >
                  Get an Estimate
                </SectionAnchor>
              </div>
              <div className={styles.heroNotes}>
                <span>
                  {country === "AG" ? "UL" : country === "DM" ? "CE" : "UL/CE"}{" "}
                  Certified Equipment
                </span>
                <span>{hero.support}</span>
                <span>LiFePO4 Battery</span>
              </div>
            </div>
          </div>
          {immersive && (
            <SectionAnchor href="#calculator" className={styles.exploreCue}>
              Explore your savings <span aria-hidden="true">↓</span>
            </SectionAnchor>
          )}
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
            <AntiguaSolarCalculator country={country} />
          </div>
        </section>

        <WhyChooseUs country={country} />

        <SolarInstallation country={country} />
        {contactSlot}
      </main>
      <SiteFooter />
    </div>
  );
}
