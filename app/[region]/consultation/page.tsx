import { ConsultationFlow } from "@/components/consultation-flow";
import {
  regionMetadata,
  requireRegion,
  type RegionPageProps,
} from "@/lib/region-seo";

export function generateMetadata({ params }: RegionPageProps) {
  return regionMetadata(params, "consultation");
}
export default async function RegionalConsultationPage({
  params,
}: RegionPageProps) {
  const country = await requireRegion(params);
  return <ConsultationFlow country={country} />;
}
