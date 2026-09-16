import type { ServiceCountry } from "./consultation-intake";

export const REGION_SLUGS = { AG: "antigua", DM: "dominica" } as const;
export const COUNTRY_NAMES = {
  AG: "Antigua and Barbuda",
  DM: "Dominica",
} as const;
export function countryFromSlug(slug: string): ServiceCountry | null {
  return slug === "antigua" ? "AG" : slug === "dominica" ? "DM" : null;
}
export function countryFromPath(pathname: string): ServiceCountry | null {
  // Only the exact root is an Antigua alias; generic/unknown routes stay neutral.
  if (pathname === "/") return "AG";
  return countryFromSlug(pathname.split("/")[1] ?? "");
}
export function regionPath(country: ServiceCountry | null, suffix = "") {
  return country ? `/${REGION_SLUGS[country]}${suffix}` : suffix || "/";
}
export function switchedRegionPath(pathname: string, country: ServiceCountry) {
  if (pathname === "/" && country === "AG") return "/";
  const parts = pathname.split("/").filter(Boolean);
  if (countryFromSlug(parts[0] ?? "")) parts.shift();
  const suffix =
    parts.length === 1 && ["faq", "privacy", "consultation"].includes(parts[0])
      ? `/${parts[0]}`
      : "";
  return regionPath(country, suffix);
}
