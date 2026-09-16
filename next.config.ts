import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
