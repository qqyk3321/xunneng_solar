"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { beforeSendAnalytics, isAnalyticsPath } from "@/lib/web-analytics";

export function SiteAnalytics() {
  const pathname = usePathname();
  // Do not load the tracking script on a direct visit to an excluded page.
  // beforeSend also guards later navigation after the script has been loaded.
  if (!isAnalyticsPath(pathname)) return null;
  return <Analytics beforeSend={beforeSendAnalytics} debug={false} />;
}
