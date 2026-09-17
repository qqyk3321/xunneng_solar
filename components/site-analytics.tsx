"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { beforeSendAnalytics, isAnalyticsPath } from "@/lib/web-analytics";

function beforeSendBrowserAnalytics(event: BeforeSendEvent) {
  // The SDK retains its callback after unmount. Check the current authorized
  // render, not a captured `true`, so returning to a lock screen cannot count.
  const solarAuthorized = window.location.pathname === "/solar-analysis" &&
    document.querySelector('[data-solar-analytics="authorized"]') !== null;
  return beforeSendAnalytics(event, solarAuthorized);
}

export function SiteAnalytics() {
  const pathname = usePathname();
  // Do not load the tracking script on a direct visit to an excluded page.
  // beforeSend also guards later navigation after the script has been loaded.
  if (!isAnalyticsPath(pathname)) return null;
  return <Analytics beforeSend={beforeSendBrowserAnalytics} debug={false} />;
}

/** Mounted ONLY by the server's password-verified branch, never the root tracker. */
export function AuthorizedSolarAnalytics() {
  const pathname = usePathname();
  if (pathname !== "/solar-analysis") return null;
  return <>
    <span hidden data-solar-analytics="authorized" />
    <Analytics beforeSend={beforeSendBrowserAnalytics} debug={false} />
  </>;
}
