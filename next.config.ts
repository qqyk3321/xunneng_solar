import type { NextConfig } from "next";
import modelManifest from "./lib/solution-suggest/model-table-manifest.json";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*/submission/*": [`./public${modelManifest.url}`],
  },
  async headers() {
    const brandHeaders = ["/icon.svg", "/flags/ag.svg", "/flags/dm.svg"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400" },
        {
          key: "Vercel-CDN-Cache-Control",
          value: "public, max-age=31536000, stale-while-revalidate=604800",
        },
      ],
    }));
    return [{
      source: "/:region(antigua|dominica)/submission/:token",
      // Redacting the event URL alone does not remove the HTTP Referer header.
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }, { source: "/solar-data/:path*", headers: [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      { key: "Vercel-CDN-Cache-Control", value: "public, max-age=31536000" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Robots-Tag", value: "noindex" },
    ] }, ...brandHeaders];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
