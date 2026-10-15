import type { BeforeSendEvent } from "@vercel/analytics/next";

const TRACKED_PATHS = new Set([
  "/",
  "/privacy",
  "/antigua",
  "/dominica",
  "/antigua/consultation",
  "/dominica/consultation",
  "/antigua/faq",
  "/dominica/faq",
  "/antigua/how-it-works",
  "/dominica/how-it-works",
]);

const SUBMISSION_PATH = /^\/(antigua|dominica)\/submission\/[A-Za-z0-9_-]+\/?$/;

export function isAnalyticsPath(pathname: string | null): boolean {
  return pathname !== null && (TRACKED_PATHS.has(pathname) || SUBMISSION_PATH.test(pathname));
}

/** Page views only, on explicitly approved routes. Never send query data. */
export function beforeSendAnalytics(
  event: BeforeSendEvent,
): BeforeSendEvent | null {
  try {
    if (event.type !== "pageview") return null;
    const url = new URL(event.url);
    const allowed = isAnalyticsPath(url.pathname);
    if (!allowed || !["http:", "https:"].includes(url.protocol)) return null;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    const submission = url.pathname.match(SUBMISSION_PATH);
    // Group quotation visits by region without disclosing the private access token.
    if (submission) url.pathname = `/${submission[1]}/submission`;
    return { type: "pageview", url: url.toString() };
  } catch {
    // A malformed analytics event must never break the page.
    return null;
  }
}
