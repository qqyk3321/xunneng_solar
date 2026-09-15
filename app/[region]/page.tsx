import { DemoHomepage } from "@/components/demo-homepage";
import { HomepageContact } from "@/components/homepage-contact";
import {
  regionMetadata,
  regionOrganization,
  requireRegion,
  type RegionPageProps,
} from "@/lib/region-seo";

export function generateMetadata({ params }: RegionPageProps) {
  return regionMetadata(params, "home");
}
export default async function RegionHomePage({ params }: RegionPageProps) {
  const country = await requireRegion(params);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(regionOrganization(country)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <DemoHomepage contactSlot={<HomepageContact />} />
    </>
  );
}
