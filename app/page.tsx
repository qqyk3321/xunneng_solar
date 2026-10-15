import { CaribbeanHomepage } from "@/components/caribbean-homepage";
import { organizationIdentity, regionAlternates, siteUrl, socialMetadata, websiteIdentity } from "@/lib/region-seo";

const title = "Solortide | Sol & Tide Energy — Caribbean Solar";
const description =
  "Solortide by Sol & Tide Energy provides solar and battery solutions for Caribbean homes. Explore home energy planning in Antigua & Barbuda and Dominica.";
export const metadata = {
  title,
  description,
  alternates: { canonical: siteUrl("/"), languages: regionAlternates() },
  ...socialMetadata(title, description, "/"),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteIdentity()).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationIdentity()).replace(/</g, "\\u003c"),
        }}
      />
      <CaribbeanHomepage />
    </>
  );
}
