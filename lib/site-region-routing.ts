import type { ServiceCountry } from "./consultation-intake";

export const REGION_SLUGS = { AG: "antigua", DM: "dominica" } as const;
export type RegionIntent = "savings" | "assessment" | "faq" | "how-it-works";
export function regionIntentPath(country: ServiceCountry, intent: RegionIntent) {
  return regionPath(country, intent === "assessment" ? "/consultation" : intent === "savings" ? "" : `/${intent}`);
}
export const COUNTRY_NAMES = {
  AG: "Antigua and Barbuda",
  DM: "Dominica",
} as const;
export function countryFromSlug(slug: string): ServiceCountry | null {
  return slug === "antigua" ? "AG" : slug === "dominica" ? "DM" : null;
}
export function countryFromPath(pathname: string): ServiceCountry | null {
  // The Caribbean entry page is neutral; a country comes from its URL segment.
  return countryFromSlug(pathname.split("/")[1] ?? "");
}
export function regionPath(country: ServiceCountry | null, suffix = "") {
  if (suffix === "/privacy") return "/privacy";
  return country ? `/${REGION_SLUGS[country]}${suffix}` : suffix || "/";
}
export function switchedRegionPath(pathname: string, country: ServiceCountry) {
  const parts = pathname.split("/").filter(Boolean);
  if (countryFromSlug(parts[0] ?? "")) parts.shift();
  if (parts.length === 1 && parts[0] === "privacy") return "/privacy";
  const suffix =
    parts.length === 1 && ["faq", "privacy", "consultation", "how-it-works"].includes(parts[0])
      ? `/${parts[0]}`
      : "";
  return regionPath(country, suffix);
}
