"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isAnalyticsPath } from "@/lib/web-analytics";

const Tracker = dynamic(() => import("./site-analytics").then(module => module.SiteAnalytics), { ssr: false });

// Keep the Analytics SDK out of PWA downloads, not merely its HTTP requests.
export function SiteAnalytics() {
  const pathname = usePathname();
  return isAnalyticsPath(pathname) ? <Tracker /> : null;
}
