import type { BeforeSendMiddleware } from "@vercel/speed-insights";

const PUBLIC_PATH = /^\/(?:privacy\/?|(?:antigua|dominica)(?:\/(?:consultation|faq|how-it-works))?\/?)?$/;
const SUBMISSION_PATH = /^\/(antigua|dominica)\/submission\/[A-Za-z0-9_-]+\/?$/;

export function isSpeedInsightsPath(pathname: string | null): boolean {
  return pathname !== null && (PUBLIC_PATH.test(pathname) || SUBMISSION_PATH.test(pathname));
}

// Keep customer submission tokens and query parameters out of performance data.
// The callback also filters events after client-side navigation off a public page.
export const beforeSendSpeedInsights: BeforeSendMiddleware = (event) => {
  try {
    const url = new URL(event.url);
    if (!isSpeedInsightsPath(url.pathname) || !["http:", "https:"].includes(url.protocol)) return null;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    const submission = url.pathname.match(SUBMISSION_PATH);
    if (submission) url.pathname = `/${submission[1]}/submission`;
    return { ...event, url: url.toString(), route: url.pathname };
  } catch {
    return null;
  }
};
