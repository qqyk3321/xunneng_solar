import type { BeforeSendEvent } from "@vercel/analytics/next";

const TRACKED_PATHS = new Set([
  "/",
  "/antigua",
  "/dominica",
  "/consultation",
  "/antigua/consultation",
  "/dominica/consultation",
]);

export function isAnalyticsPath(pathname: string | null): boolean {
  return pathname !== null && TRACKED_PATHS.has(pathname);
}

/** Page views only, on explicitly approved routes. Never send query data. */
export function beforeSendAnalytics(
  event: BeforeSendEvent,
  solarAuthorized = false,
): BeforeSendEvent | null {
  try {
    if (event.type !== "pageview") return null;
    const url = new URL(event.url);
    const allowed = isAnalyticsPath(url.pathname) ||
      (solarAuthorized && url.pathname === "/solar-analysis");
    if (!allowed || !["http:", "https:"].includes(url.protocol)) return null;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    return { type: "pageview", url: url.toString() };
  } catch {
    // A malformed analytics event must never break the page.
    return null;
  }
}
