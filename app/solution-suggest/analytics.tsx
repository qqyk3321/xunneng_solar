"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  // The SDK keeps its callback after unmount; recheck the authorized page.
  if (event.type !== "pageview" || window.location.pathname !== "/solution-suggest" ||
      !document.querySelector('[data-solution-suggest-analytics="authorized"]')) return null;
  try {
    const url = new URL(event.url);
    if (url.pathname !== "/solution-suggest" || !["http:", "https:"].includes(url.protocol)) return null;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    return { type: "pageview", url: url.toString() };
  } catch {
    return null;
  }
}

/** Mounted only after this module's server-side password validation. */
export function AuthorizedSolarAnalytics() {
  const pathname = usePathname();
  if (pathname !== "/solution-suggest") return null;
  return <>
    <span hidden data-solution-suggest-analytics="authorized" />
    <Analytics beforeSend={beforeSend} debug={false} />
  </>;
}
