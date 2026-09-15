import { DemoHomepage } from "@/components/demo-homepage";
import { HomepageContact } from "@/components/homepage-contact";
import { regionAlternates, siteUrl, socialMetadata } from "@/lib/region-seo";

const title = "Caribbean Solar & Battery Storage | Sol & Tide Energy";
const description =
  "Solar and battery storage for Caribbean homes. Explore electricity savings, backup power and installation support in Antigua and Dominica.";
export const metadata = {
  title,
  description,
  alternates: { canonical: siteUrl(), languages: regionAlternates() },
  ...socialMetadata(title, description),
};

export default function HomePage() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteUrl("/#organization"),
    name: "Sol & Tide Energy",
    url: siteUrl(),
    logo: siteUrl("/icon.svg"),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization).replace(/</g, "\\u003c"),
        }}
      />
      <DemoHomepage contactSlot={<HomepageContact />} />
    </>
  );
}
