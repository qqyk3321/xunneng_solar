import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/region-seo";

export default function robots(): MetadataRoute.Robots {
  const preview =
    process.env.NODE_ENV !== "production" ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production");
  return {
    rules: {
      userAgent: "*",
      ...(preview ? { disallow: "/" } : { allow: "/", disallow: "/api/" }),
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
