import { ConsultationFlow } from "@/components/consultation-flow";
import { regionMetadata, type RegionPageProps } from "@/lib/region-seo";

export function generateMetadata({ params }: RegionPageProps) {
  return regionMetadata(params, "consultation");
}
export default function RegionalConsultationPage() {
  return <ConsultationFlow />;
}
