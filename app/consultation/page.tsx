import { ConsultationFlow } from "@/components/consultation-flow";

export default function ConsultationPage() {
  return <ConsultationFlow apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? ""} />;
}
