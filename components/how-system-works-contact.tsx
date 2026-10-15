"use client";

import { useEffect, useState } from "react";
import { DeferredFloatingContact } from "./deferred-floating-contact";
import { useSiteRegion } from "./site-region";

/** Keep the existing contact dialogs available throughout the guide. */
export function HowSystemWorksContact() {
  const { country, open: regionOpen } = useSiteRegion();
  const [cookieVisible, setCookieVisible] = useState(true);

  useEffect(() => {
    const cookie = (event: Event) =>
      setCookieVisible(Boolean((event as CustomEvent).detail));
    setCookieVisible(Boolean(document.querySelector("[data-cookie-notice]")));
    window.addEventListener("sol-tide:cookie-notice", cookie);
    return () => {
      window.removeEventListener("sol-tide:cookie-notice", cookie);
    };
  }, []);

  if (!country || regionOpen || cookieVisible) return null;
  return <DeferredFloatingContact />;
}
