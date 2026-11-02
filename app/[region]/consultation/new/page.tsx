import { permanentRedirect } from "next/navigation";
import { requireRegion, type RegionPageProps } from "@/lib/region-seo";
import { regionPath } from "@/lib/site-region-routing";
export default async function Page({ params }: RegionPageProps) {
  permanentRedirect(regionPath(await requireRegion(params), "/consultation"));
}
