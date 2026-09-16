"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./why-choose-us.module.css";

/** A small hydration island; the surrounding benefits content stays server-rendered. */
export function AnimatedStatValue({
  value,
  suffix,
}: {
  value: number;
  suffix: string;
}) {
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
