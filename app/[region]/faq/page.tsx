import FaqPage from "@/components/regional-faq-page";
import { regionMetadata, type RegionPageProps } from "@/lib/region-seo";

export function generateMetadata({ params }: RegionPageProps) {
  return regionMetadata(params, "faq");
}
export default FaqPage;
