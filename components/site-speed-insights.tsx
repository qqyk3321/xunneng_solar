"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";
import { beforeSendSpeedInsights, isSpeedInsightsPath } from "@/lib/speed-insights";

export function SiteSpeedInsights() {
  const pathname = usePathname();
  if (!isSpeedInsightsPath(pathname)) return null;

  return <SpeedInsights sampleRate={1} debug={false} beforeSend={beforeSendSpeedInsights} />;
}
