import { HowSystemWorksPage } from "@/components/how-system-works-page";
import {
  regionAlternates,
  requireRegion,
  siteUrl,
  socialMetadata,
  type RegionPageProps,
} from "@/lib/region-seo";
import { COUNTRY_NAMES, regionPath } from "@/lib/site-region-routing";
export async function generateMetadata({ params }: RegionPageProps) {
  const country = await requireRegion(params);
  const path = regionPath(country, "/how-it-works");
  const title = `How Hybrid Solar Works — ${COUNTRY_NAMES[country]} | Solortide`;
  const description =
    "Explore solar, battery storage and backup with an interactive demonstration of hybrid home energy.";
  return {
    title,
    description,
    alternates: {
      canonical: siteUrl(path),
      languages: regionAlternates("/how-it-works"),
    },
    ...socialMetadata(title, description, path),
  };
}
export default async function Page({ params }: RegionPageProps) {
  return <HowSystemWorksPage country={await requireRegion(params)} />;
}
