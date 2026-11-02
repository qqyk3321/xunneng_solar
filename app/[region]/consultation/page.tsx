import { NativeConsultationForm } from "@/components/native-consultation/form";
import { nativeEnabled } from "@/lib/native-consultation/config";
import { notFound } from "next/navigation";
import {
  regionMetadata,
  requireRegion,
  type RegionPageProps,
} from "@/lib/region-seo";

export const dynamic = "force-dynamic";
export function generateMetadata({ params }: RegionPageProps) {
  return regionMetadata(params, "consultation");
}
export default async function RegionalConsultationPage({
  params,
}: RegionPageProps) {
  const country = await requireRegion(params);
  if (!nativeEnabled()) notFound();
  return <NativeConsultationForm key={country} country={country} />;
}
