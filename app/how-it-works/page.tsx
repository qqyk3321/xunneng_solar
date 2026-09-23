import { HowSystemWorksPage } from "@/components/how-system-works-page";
import { siteUrl, socialMetadata } from "@/lib/region-seo";
const title = "How Hybrid Solar & Battery Systems Work | Sol & Tide Energy";
const description =
  "Follow an animated energy-flow demonstration of solar panels, hybrid inverters, batteries and grid support for Caribbean homes.";
export const metadata = {
  title,
  description,
  alternates: { canonical: siteUrl("/how-it-works") },
  ...socialMetadata(title, description, "/how-it-works"),
};
export default function Page() {
  return <HowSystemWorksPage />;
}
