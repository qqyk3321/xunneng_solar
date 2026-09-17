import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    return [{ source: "/solar-data/:path*", headers: [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      { key: "Vercel-CDN-Cache-Control", value: "public, max-age=31536000" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Robots-Tag", value: "noindex" },
    ] }, { source: "/solar-analysis/sw.js", headers: [
      { key: "Cache-Control", value: "no-store" },
      { key: "Service-Worker-Allowed", value: "/solar-analysis" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; connect-src 'self'" },
    ] }, { source: "/solar-analysis/offline-assets.json", headers: [
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex" },
    ] }, ...brandHeaders, ...["/fonts/report-space-grotesk-v1.ttf"].map(source=>({
      source,
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }))];
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
