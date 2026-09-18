import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PWA_ACCESS_COOKIE, pwaCookieIsValid } from "@/app/solar-analysis/access";
import SolarAnalysis from "@/app/solar-analysis/solar-analysis-client";
import AppManifest from "./app-manifest";

export const dynamic = "force-dynamic";

// Only delivery requires authorization. The complete local copy is cache-first:
// it never visits this server gate again unless the user removes its resources.
export default async function OfflineApplication() {
  if (!pwaCookieIsValid((await cookies()).get(PWA_ACCESS_COOKIE)?.value)) redirect("/pwa");
  return <div data-solar-offline-app="true"><AppManifest /><SolarAnalysis /></div>;
}
