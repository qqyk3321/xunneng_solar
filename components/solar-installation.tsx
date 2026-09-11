"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { AssessmentLink } from "./assessment-link";
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
export function SolarInstallation() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      !section.current ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );
    section.current
      .querySelectorAll("[data-installation-step]")
      .forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={section}
      id="solar-installation"
      className={styles.section}
      aria-labelledby="installation-heading"
      tabIndex={-1}
    >
      <div className={styles.container}>
        <div className={styles.heading}>
          <h2 id="installation-heading">Your Solar Installation in Antigua</h2>
          <p>
            A clear path from your first request to solar-powered everyday
            living.
          </p>
        </div>
        <ol className={styles.timeline} aria-label="Solar installation steps">
          {steps.map((step, index) => (
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
        <div className={styles.actions}>
          <AssessmentLink className={styles.cta} arrow />
          <p>
            Visit and installation timing depends on your property, access and
            scheduling.
          </p>
        </div>
      </div>
    </section>
  );
}
