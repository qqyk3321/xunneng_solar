"use client";

import { useEffect, useState } from "react";
import { FloatingQuestionButton } from "./floating-question-button";
import { useSiteRegion } from "./site-region";

/** General enquiries can reach WhatsApp before choosing an installation region. */
export function HomepageFloatingContact({ blocked }: { blocked: boolean }) {
  const { open: regionOpen } = useSiteRegion();
  const [cookieVisible, setCookieVisible] = useState(true);

  useEffect(() => {
    const cookie = (event: Event) =>
      setCookieVisible(Boolean((event as CustomEvent).detail));
    setCookieVisible(Boolean(document.querySelector("[data-cookie-notice]")));
    window.addEventListener("sol-tide:cookie-notice", cookie);
    return () => window.removeEventListener("sol-tide:cookie-notice", cookie);
  }, []);

  if (blocked || regionOpen || cookieVisible) return null;
  return <FloatingQuestionButton disabled={false} compact />;
}
