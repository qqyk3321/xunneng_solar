"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Only the visual number interpolates; calculator inputs and recommendations update immediately. */
export function SmoothEstimateValue({ value, format, active }: {
  value: number;
  format: (value: number) => string;
  active: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  useLayoutEffect(() => {
    const desktop = window.matchMedia("(min-width: 801px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      current.current = value;
      setDisplay(value);
    };
    if (!active || !desktop.matches || reduced.matches || current.current === value) {
      finish();
      return;
    }
    const from = current.current;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 180, 1);
      current.current = from + (value - from) * (1 - (1 - progress) ** 3);
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    desktop.addEventListener("change", finish);
    reduced.addEventListener("change", finish);
    return () => {
      cancelAnimationFrame(frame);
      desktop.removeEventListener("change", finish);
      reduced.removeEventListener("change", finish);
    };
  }, [value, active]);
  return <span data-estimate-value={value}>{format(display)}</span>;
}
