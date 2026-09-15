import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RegionLinks } from "@/components/region-links";
import { regionAlternates, siteUrl } from "@/lib/region-seo";

export const metadata = {
  title: "Choose Your Location | Free Solar Assessment | Sol & Tide Energy",
  alternates: {
    canonical: siteUrl("/consultation"),
    languages: regionAlternates("/consultation"),
  },
};

export default function ConsultationPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 1100, margin: "60px auto", padding: "0 24px" }}>
        <h1>Start your assessment</h1>
        <p>Choose your installation location to continue.</p>
        <RegionLinks suffix="/consultation" />
        <p>More Caribbean locations are coming soon.</p>
      </main>
      <SiteFooter />
    </>
  );
}
