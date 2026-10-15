"use client";

import { useEffect, useState } from "react";
import { FloatingQuestionButton } from "./floating-question-button";
import { useSiteRegion } from "./site-region";

/** Opens contact options, including a shortcut to the in-page form. */
export function ScrollQuestionButton({
  targetId,
}: {
  targetId: string;
}) {
  const { country, open: regionOpen } = useSiteRegion();
  const [landingVisible, setLandingVisible] = useState(true);
  const [cookieVisible, setCookieVisible] = useState(false);
  useEffect(() => {
    const hero = document.querySelector('[data-testid="home-hero"]');
    const header = document.querySelector("header");
    const scroll = () =>
      setLandingVisible(Boolean(
        hero && hero.getBoundingClientRect().bottom > (header?.getBoundingClientRect().bottom ?? 0),
      ));
    const cookie = (event: Event) =>
      setCookieVisible(Boolean((event as CustomEvent).detail));
    scroll();
    setCookieVisible(Boolean(document.querySelector("[data-cookie-notice]")));
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    window.addEventListener("sol-tide:cookie-notice", cookie);
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("sol-tide:cookie-notice", cookie);
    };
  }, []);
  if (!country || regionOpen || landingVisible || cookieVisible) return null;
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
