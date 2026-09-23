import Link from "next/link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AssessmentLink } from "./assessment-link";
import { HybridEnergyDemo } from "./hybrid-energy-demo";
import type { ServiceCountry } from "@/lib/consultation-intake";
import { regionPath } from "@/lib/site-region-routing";
import styles from "./how-system-works-page.module.css";

export function HowSystemWorksPage({
  country = null,
}: {
  country?: ServiceCountry | null;
}) {
  return (
    <div className={styles.page}>
      <SiteHeader caribbean={!country} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <Link href={regionPath(country)} className={styles.back}>
            ← Back to home
          </Link>
          <p className={styles.eyebrow}>UNDERSTAND YOUR HOME ENERGY</p>
          <h1>
            One system.
            <br />
            <em>Different ways to power your day.</em>
          </h1>
          <p>
            Solar panels, a battery and the grid each play a part. Your hybrid
            inverter brings them together. Follow the energy below to see how.
          </p>
        </div>
        <HybridEnergyDemo />
        <section className={styles.explainer} aria-labelledby="hybrid-basics">
          <div>
            <p className={styles.eyebrow}>THE PARTS, EXPLAINED</p>
            <h2 id="hybrid-basics">
              A little understanding.
              <br />A more confident decision.
            </h2>
          </div>
          <div className={styles.cards}>
            <article>
              <span>01</span>
              <h3>Generate & store</h3>
              <p>
                Panels turn sunlight into DC electricity. A LiFePO4 battery
                stores energy for later, within its usable capacity and
                configured reserve.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Convert & coordinate</h3>
              <p>
                The hybrid inverter converts DC energy into AC for household
                appliances and manages charging and supply according to the
                system settings.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Plan for backup</h3>
              <p>
                Backup is designed around selected loads and available power.
                Air conditioning, water heating and other demanding appliances
                need to be included in the sizing discussion.
              </p>
            </article>
          </div>
        </section>
        <section className={styles.next}>
          <div>
            <h2>What would this look like in your home?</h2>
            <p>
              Tell us about your electricity use and backup priorities. We’ll
              help you explore a suitable design.
            </p>
          </div>
          <AssessmentLink className={styles.cta} />
        </section>
        <p className={styles.sources}>
          Further reading:{" "}
          <a
            href="https://www.energy.gov/cmei/systems/solar-integration-inverters-and-grid-services-basics"
            target="_blank"
            rel="noopener noreferrer"
          >
            US Department of Energy · Inverters & grid services
          </a>{" "}
          ·{" "}
          <a
            href="https://www.energy.gov/cmei/systems/solar-integration-solar-energy-and-storage-basics"
            target="_blank"
            rel="noopener noreferrer"
          >
            Solar & storage basics
          </a>
        </p>
      </main>
      <SiteFooter caribbean={!country} />
    </div>
  );
}
