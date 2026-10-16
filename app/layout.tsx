import type { Metadata } from "next";
import "./globals.css";
import { SiteRegionProvider } from "@/components/site-region";
import { SiteNavigationLoader } from "@/components/site-navigation-loader";
import { siteUrl } from "@/lib/region-seo";
import { SiteAnalytics } from "@/components/site-analytics-gate";
import { SiteSpeedInsights } from "@/components/site-speed-insights";
import { KnocketWidget } from "@/components/knocket-widget";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  robots: process.env.NODE_ENV !== "production" || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    ? { index: false, follow: false }
    : { index: true, follow: true },
  title: "Solortide | Sol & Tide Energy — Caribbean Solar & Storage",
  description:
    "Solortide by Sol & Tide Energy: solar and battery solutions for Caribbean homes in Antigua and Barbuda and Dominica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.documentElement.dataset.siteLoading="initial";window.__solTideInitialLoader=window.setTimeout(function(){if(document.documentElement.dataset.siteLoading==="initial")delete document.documentElement.dataset.siteLoading},20000)',
          }}
        />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossOrigin="anonymous"
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteNavigationLoader />
        <SiteRegionProvider>{children}</SiteRegionProvider>
        <KnocketWidget />
        {process.env.VERCEL_ENV === "production" && <SiteAnalytics />}
        {process.env.VERCEL_ENV === "production" && <SiteSpeedInsights />}
      </body>
    </html>
  );
}
