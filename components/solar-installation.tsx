import type { CSSProperties } from "react";
import type { ServiceCountry } from "@/lib/consultation-intake";
import { AssessmentLink } from "./assessment-link";
import { InstallationReveal } from "./installation-reveal";
import styles from "./solar-installation.module.css";

const steps = [
  {
    title: "Your Initial Solar Plan",
    timing: "Within 48 hours",
    text: "Submit your request with your property details and electricity needs. We’ll use satellite data and the information you share to email you an initial system proposal within 48 hours.",
  },
  {
    title: "An Engineer Visits You",
    timing: "Around 2–4 days",
    text: "Happy with the initial proposal? With your agreement, we’ll arrange an engineer’s visit to assess your home and develop a complete, site-specific plan. Allow around 2–4 days for this stage.",
  },
  {
    title: "Professional Installation",
    timing: "Typically 1–2 days",
    text: "Once you approve the final plan, our team schedules and installs your system. Professional installation typically takes 1–2 days, followed by checks to get everything ready for use.",
  },
  {
    title: "Watch Your Bill Drop",
    timing: "Once your system is live",
    text: "Start putting Antigua’s sunshine to work for your home. Follow your energy use and see how your electricity bill changes, with our team available for ongoing support.",
  },
];

/** Standalone installation journey, separate from the future system-explainer page. */
export function SolarInstallation({
  country,
}: {
  country: ServiceCountry | null;
}) {
  const location =
    country === "DM"
      ? "Dominica"
      : country === "AG"
        ? "Antigua"
        : "the Caribbean";
  const regionalSteps = steps.map((step) => ({
    ...step,
    text: step.text.replace("Antigua’s", `${location}’s`),
  }));

  return (
    <section
      id="solar-installation"
      className={styles.section}
      aria-labelledby="installation-heading"
      tabIndex={-1}
    >
      <InstallationReveal sectionId="solar-installation" />
      <div className={styles.container}>
        <div className={styles.heading}>
          <h2 data-reveal="heading-centered" id="installation-heading">
            Your Solar Installation in {location}
          </h2>
        </div>
        <ol className={styles.timeline} aria-label="Solar installation steps">
          {regionalSteps.map((step, index) => (
            <li
              key={step.title}
              className={styles.step}
              data-installation-step
              style={{ "--step-delay": `${index * 90}ms` } as CSSProperties}
            >
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles.card}>
                <h3>{step.title}</h3>
                <span className={styles.timing}>{step.timing}</span>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <ol className={styles.mobileTimeline} aria-label="Solar installation steps">
          {regionalSteps.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">{index + 1}</span>
              <details
                className={styles.mobileCard}
                name="solar-installation-steps"
                open={index === 0}
              >
                <summary>
                  <div>
                    <h3>{step.title}</h3>
                    <span className={styles.timing}>{step.timing}</span>
                  </div>
                  <span className={styles.toggle} aria-hidden="true" />
                </summary>
                <p>{step.text}</p>
              </details>
            </li>
          ))}
        </ol>
        <div className={styles.actions}>
          <AssessmentLink country={country} className={styles.cta} arrow />
        </div>
      </div>
    </section>
  );
}
