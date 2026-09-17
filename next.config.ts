import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/solar-analysis/model": ["./data/solar-generation/pvwatts-v8/**/*.json", "./data/solar-generation/additional-v1/**/manifest.json", "./data/solar-generation/additional-v1/**/hourly.json.gz"],
  },
  outputFileTracingExcludes: {
    "/solar-analysis/model": ["./data/solar-generation/additional-v1/**/raw.json.gz", "./data/solar-generation/additional-v1/**/weather/**", "./data/solar-generation/additional-v1/**/*.request.json", "./data/solar-generation/additional-v1/**/curve.json"],
  },
  async headers() {
    return ["/icon.svg", "/flags/ag.svg", "/flags/dm.svg"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400" },
        {
          key: "Vercel-CDN-Cache-Control",
          value: "public, max-age=31536000, stale-while-revalidate=604800",
        },
      ],
    }));
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
