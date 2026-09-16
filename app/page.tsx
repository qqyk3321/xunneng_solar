import { RegionalHomepage } from "@/components/regional-homepage";
import { countryMetadata } from "@/lib/region-seo";

// Additional entry point only: /antigua remains the canonical business URL.
export const metadata = countryMetadata("AG", "home");

export default function HomePage() {
  return <RegionalHomepage country="AG" />;
}
