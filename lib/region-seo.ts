import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_CONTACT, supportEmail } from "./site-contact";
import type { ServiceCountry } from "./consultation-intake";
import {
  countryFromSlug,
  COUNTRY_NAMES,
  regionPath,
} from "./site-region-routing";

export type RegionPageProps = { params: Promise<{ region: string }> };
export async function requireRegion(params: RegionPageProps["params"]) {
  const country = countryFromSlug((await params).region);
  if (!country) notFound();
  return country;
}
export function siteUrl(path = "/") {
  return new URL(path, process.env.SITE_URL || "https://www.solortide.com")
    .href;
}

export function websiteIdentity() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    name: "Solortide",
    alternateName: "Sol & Tide Energy",
    url: siteUrl("/"),
    publisher: { "@id": siteUrl("/#organization") },
  };
}

export function organizationIdentity(country?: ServiceCountry) {
  const countries: ServiceCountry[] = country ? [country] : ["AG", "DM"];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteUrl("/#organization"),
    name: "Sol & Tide Energy",
    alternateName: "Solortide",
    url: siteUrl(),
    logo: siteUrl("/brand/solortide-logo.svg"),
    sameAs: [SITE_CONTACT.facebookUrl],
    description:
      "Solortide by Sol & Tide Energy provides solar and battery solutions for Caribbean homes in Antigua and Barbuda and Dominica.",
    areaServed: (["AG", "DM"] as const).map((code) => ({
      "@type": "Country",
      name: COUNTRY_NAMES[code],
    })),
    contactPoint: countries.map((country) => ({
      "@type": "ContactPoint",
      "@id": siteUrl(`${regionPath(country)}#support`),
      contactType: "customer support",
      email: supportEmail(country),
      areaServed: { "@type": "Country", name: COUNTRY_NAMES[country] },
      url: siteUrl(regionPath(country)),
    })),
  };
}

export function regionOrganization(country: ServiceCountry) {
  return organizationIdentity(country);
}
export function socialMetadata(
  title: string,
  description: string,
  path = "",
): Metadata {
  const image = {
    url: siteUrl("/opengraph-image"),
    width: 1200,
    height: 630,
    alt: "Solortide by Sol & Tide Energy — Solar and battery storage for Caribbean homes",
  };
  return {
    openGraph: {
      title,
      description,
      url: siteUrl(path),
      type: "website",
      siteName: "Solortide",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}
export function faqMetadata(country: ServiceCountry): Metadata {
  const path = regionPath(country, "/faq");
  const title = `Solar & Battery FAQs — ${COUNTRY_NAMES[country]} | Solortide`;
  const description =
    "Answers about solar, LiFePO4 batteries, equipment certification and installation support for homes in Antigua and Dominica.";
  return {
    title,
    description,
    alternates: {
      canonical: siteUrl(path),
      languages: {
        "en-AG": siteUrl("/antigua/faq"),
        "en-DM": siteUrl("/dominica/faq"),
      },
    },
    ...socialMetadata(title, description, path),
  };
}
export function regionAlternates(suffix = ""): Record<string, string> {
  return {
    "en-AG": siteUrl(regionPath("AG", suffix)),
    "en-DM": siteUrl(regionPath("DM", suffix)),
    ...(suffix ? {} : { "x-default": siteUrl("/") }),
  };
}
export async function regionMetadata(
  params: RegionPageProps["params"],
  page: "home" | "faq" | "consultation",
): Promise<Metadata> {
  const country = await requireRegion(params);
  return countryMetadata(country, page);
}
export function countryMetadata(
  country: ServiceCountry,
  page: "home" | "faq" | "consultation",
): Metadata {
  if (page === "faq") return faqMetadata(country);
  const suffix = page === "home" ? "" : `/${page}`;
  const title =
    page === "home"
      ? `Solar & Battery Storage in ${COUNTRY_NAMES[country]} | Solortide`
      : `Free Solar Assessment — ${COUNTRY_NAMES[country]} | Solortide`;
  const description =
    page === "home"
      ? `Explore solar and battery storage for homes in ${COUNTRY_NAMES[country]}, with local electricity savings estimates, equipment information and installation support.`
      : `Request a solar and battery assessment for your home in ${COUNTRY_NAMES[country]}.`;
  const path = regionPath(country, suffix);
  const url = siteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url, languages: regionAlternates(suffix) },
    ...socialMetadata(title, description, path),
  };
}
