import type { MetadataRoute } from "next";
import { regionAlternates, siteUrl } from "@/lib/region-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = ["", "/consultation"].flatMap(
    (suffix) =>
      ["", "/antigua", "/dominica"].map((prefix) => ({
        url: siteUrl(prefix + suffix || "/"),
        alternates: { languages: regionAlternates(suffix) },
      })),
  );
  return [...entries, { url: siteUrl("/faq") }, { url: siteUrl("/privacy") }];
}
