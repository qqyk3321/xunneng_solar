"use client";

import { useEffect, useRef, useState } from "react";
import { Leaf, ShieldCheck, MapPin, Wind } from "lucide-react";
import styles from "./why-choose-us.module.css";

const reasons = [
  {
    icon: Leaf,
    title: "Lower bills. Smarter backup. One connected system.",
    text: "Solar and battery storage help lower your bills and keep essential loads running during outages. With the right equipment and system design, solar, batteries, grid power and a compatible existing generator can be coordinated as one home energy system.",
  },
  {
    icon: ShieldCheck,
    title: "Certified equipment. Connected support.",
    text: "UL-certified equipment, with a 10-year inverter and battery warranty and 25 years for solar panels. Check your system’s status through remote monitoring and reach our support team when you need help.",
  },
  {
    icon: MapPin,
    title: "100% local. Right here in Antigua.",
    text: "A local company with local stock and people you can reach. We help keep your project moving and provide ongoing services, including solar panel cleaning and reinforcement.",
  },
  {
    icon: Wind,
    title: "Professional design for island conditions.",
    text: "From system planning to installation, we take your roof and site seriously. Our 150+ MPH-rated designs are tailored to your property, giving you a professionally planned system and greater peace of mind.",
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
    value: 10,
    suffix: "",
    prefix: "",
    label: "Years of warranty",
    note: "Inverter + battery · 25 years for panels",
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
            Your home. Our island.
            <br />
            <span>Solar you can count on.</span>
          </h2>
          <ul className={styles.reasons} aria-label="Why choose Sol & Tide">
            {reasons.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={22} strokeWidth={1.7} />
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
