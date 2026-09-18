import { CaribbeanHomepage } from "@/components/caribbean-homepage";
import { regionAlternates, siteUrl, socialMetadata } from "@/lib/region-seo";

const title = "Solar Energy for Caribbean Homes | Sol & Tide Energy";
const description =
  "Explore solar and battery solutions for Caribbean homes. Discover our planning and installation process, and choose Antigua & Barbuda or Dominica for local information.";
export const metadata = {
  title,
  description,
  alternates: { canonical: siteUrl("/"), languages: regionAlternates() },
  ...socialMetadata(title, description, "/"),
};

export default function HomePage() {
  return <CaribbeanHomepage />;
}
