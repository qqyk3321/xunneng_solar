import { CaribbeanHomepage } from "@/components/caribbean-homepage";
import { regionAlternates, siteUrl, socialMetadata, websiteIdentity } from "@/lib/region-seo";

const title = "Sol & Tide Energy (Solortide) | Caribbean Solar";
const description =
  "Explore solar and battery solutions for Caribbean homes from Sol & Tide Energy (Solortide). Discover our planning and installation process in Antigua & Barbuda and Dominica.";
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
      <CaribbeanHomepage />
    </>
  );
}
