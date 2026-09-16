import { RegionalHomepage } from "@/components/regional-homepage";
import {
  regionMetadata,
  requireRegion,
  type RegionPageProps,
} from "@/lib/region-seo";

export function generateMetadata({ params }: RegionPageProps) {
  return regionMetadata(params, "home");
}
export default async function RegionHomePage({ params }: RegionPageProps) {
  const country = await requireRegion(params);
  return <RegionalHomepage country={country} />;
}
