import type { MetadataRoute } from "next";
import { regionAlternates, siteUrl } from "@/lib/region-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const regional: MetadataRoute.Sitemap = ["", "/consultation", "/faq", "/how-it-works"].flatMap(
    (suffix) => ["/antigua", "/dominica"].map((prefix) => ({
      url: siteUrl(prefix + suffix),
      alternates: { languages: regionAlternates(suffix) },
    })),
  );
  return [
    { url: siteUrl("/"), alternates: { languages: regionAlternates() } },
    ...regional,
    { url: siteUrl("/privacy") },
  ];
}
