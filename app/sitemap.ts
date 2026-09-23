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
  return [...entries, ...["/how-it-works", "/antigua/how-it-works", "/dominica/how-it-works"].map(path => ({ url: siteUrl(path) })), { url: siteUrl("/antigua/faq") }, { url: siteUrl("/dominica/faq") }, { url: siteUrl("/privacy") }];
}
