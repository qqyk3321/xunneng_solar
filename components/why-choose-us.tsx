"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteRegion } from "./site-region";
import styles from "./why-choose-us.module.css";

const reasons = [
  {
    label: "24/7 RESILIENT POWER",
    title: "Lower bills. Smarter backup. One connected system.",
    text: "Lower bills and backup for essential loads. Solar, batteries, grid power and a compatible existing generator can work together with the right design.",
  },
  {
    label: "UL/CE CERTIFIED · 8-YEAR INVERTER WARRANTY",
    warm: true,
    title: "Certified equipment. Connected support.",
    text: "UL/CE-certified equipment. 8-year inverter warranty, LiFePO4 battery with 4,000 cycles and 15-year panel warranty — with remote monitoring and customer support.",
  },
  {
    label: "100% ANTIGUA BASED · LOCAL STOCK",
    title: "100% local. Right here in Antigua.",
    text: "Local stock. A team you can reach. Ongoing support, including solar panel cleaning and reinforcement.",
  },
  {
    label: "150+ MPH RATED DESIGN",
    title: "Professional design for island conditions.",
    text: "Professional installation tailored to your roof. 150+ MPH-rated designs, subject to mounting specifications and site assessment.",
  },
];

const statistics = [
  // Requested design placeholder, not a count read from completed projects.
  {
    id: "installations",
    value: 100,
    suffix: "+",
    prefix: "",
    label: "Systems installed",
    note: "Illustrative count · to be confirmed",
  },
  {
    id: "savings",
    value: 95,
    suffix: "%",
    prefix: "Up to",
    label: "Bill savings potential",
    note: "For a suitably sized system",
  },
  {
    id: "warranty",
    value: 8,
    suffix: "",
    prefix: "",
    label: "Years of inverter warranty",
    note: "Battery: 4,000 cycles · Panels: 15 years",
  },
  {
    id: "payback",
    value: 5,
    suffix: "",
    prefix: "Target: within",
    label: "Years to pay back",
    note: "For suitable system configurations",
  },
];

/** Count once on entry. SSR/no-JS and reduced-motion users see the final value. */
function AnimatedValue({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(value);
  const target = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (
      !target.current ||
      motion.matches ||
      !("IntersectionObserver" in window)
    )
      return;
    let frame = 0;
    let start: number | null = null;
    let finished = false;
    const finish = () => {
      finished = true;
      cancelAnimationFrame(frame);
      setDisplay(value);
      observer.disconnect();
    };
    function tick(now: number) {
      if (finished) return;
      if (start === null) start = now;
      const progress = Math.min((now - start) / 1600, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(target.current);
    const onMotionChange = () => {
      if (motion.matches) finish();
    };
    motion.addEventListener("change", onMotionChange);
    return () => {
      finished = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", onMotionChange);
    };
  }, [value]);
  return (
    <>
      <span className={styles.srOnly}>
        {value}
        {suffix}
      </span>
      <span ref={target} aria-hidden="true" data-animated-value>
        {display}
        {suffix}
      </span>
    </>
  );
}

export function WhyChooseUs() {
  const { country } = useSiteRegion();
  const certificate =
    country === "AG" ? "UL" : country === "DM" ? "CE" : "UL/CE";
  const location =
    country === "AG"
      ? "Antigua"
      : country === "DM"
        ? "Dominica"
        : "the Caribbean";
  const regionalReasons = reasons.map((reason, index) => {
    const item = {
      ...reason,
      label: reason.label.replace("UL/CE", certificate),
      text: reason.text.replace("UL/CE", certificate),
    };
    if (index === 1) item.title = `Certified equipment for ${location}.`;
    if (index === 2 && country === "DM") {
      item.label = "SERVING DOMINICA · ONGOING SUPPORT";
      item.title = "Support for your Dominica home.";
      item.text =
        "Our local team coordinates supply, installation and support in Dominica. Maintenance services and schedules are confirmed for your location.";
    }
    if (index === 3) {
      item.title = `Designed for your home in ${location}.`;
    }
    return item;
  });
  return (
    <section
      id="benefits"
      className={styles.section}
      aria-labelledby="benefits-heading"
      tabIndex={-1}
    >
      <div className={styles.layout}>
        <div className={styles.copy}>
          <h2 id="benefits-heading">
            {country === "AG"
              ? "Your Antigua home."
              : country === "DM"
                ? "Your Dominica home."
                : "Your home. Our Caribbean."}
            <br />
            <span>Solar you can count on.</span>
          </h2>
          <ul className={styles.reasons} aria-label="Why choose Sol & Tide">
            {regionalReasons.map(({ label, warm, title, text }) => (
              <li key={title}>
                <span
                  className={
                    styles.badge + (warm ? " " + styles.badgeWarm : "")
                  }
                >
                  {label}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.results}>
          <dl className={styles.stats} aria-label="System benefits at a glance">
            {statistics.map((stat) => (
              <div key={stat.id} className={styles.stat} data-stat={stat.id}>
                <dt>{stat.label}</dt>
                <dd className={styles.value}>
                  <span className={styles.prefix}>
                    {stat.prefix || "\u00a0"}
                  </span>
                  <span className={styles.number}>
                    {stat.id === "payback" && (
                      <>
                        <span className={styles.srOnly}>Less than </span>
                        <span aria-hidden="true">{"<"}</span>
                      </>
                    )}
                    <AnimatedValue value={stat.value} suffix={stat.suffix} />
                  </span>
                </dd>
                <dd className={styles.note}>{stat.note}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.disclaimer}>
            Savings and payback are planning targets, not guarantees. Your site,
            usage and final proposal determine the outcome.
          </p>
        </div>
      </div>
    </section>
  );
}
