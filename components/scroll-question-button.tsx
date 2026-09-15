"use client";

import { useEffect, useState } from "react";
import { FloatingQuestionButton } from "./floating-question-button";
import { useSiteRegion } from "./site-region";

/** Contact remains in the page; this launcher is only a scroll shortcut. */
export function ScrollQuestionButton({
  targetId,
  showImmediately = false,
}: {
  targetId: string;
  showImmediately?: boolean;
}) {
  const { country, open: regionOpen } = useSiteRegion();
  const [scrolled, setScrolled] = useState(false);
  const [cookieVisible, setCookieVisible] = useState(false);
  const [atForm, setAtForm] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 200);
    const cookie = (event: Event) =>
      setCookieVisible(Boolean((event as CustomEvent).detail));
    scroll();
    setCookieVisible(Boolean(document.querySelector("[data-cookie-notice]")));
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("sol-tide:cookie-notice", cookie);
    const observer = new IntersectionObserver(
      ([entry]) => setAtForm(entry.isIntersecting),
      { threshold: 0 },
    );
    const target = document.getElementById(targetId);
    if (target) observer.observe(target);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("sol-tide:cookie-notice", cookie);
    };
  }, [targetId]);
  if (
    !country ||
    regionOpen ||
    (!showImmediately && !scrolled) ||
    cookieVisible ||
    atForm
  )
    return null;
  return (
    <FloatingQuestionButton
      disabled={false}
      action="scroll"
      onOpen={() => {
        const target = document.getElementById(targetId);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      }}
    />
  );
}
