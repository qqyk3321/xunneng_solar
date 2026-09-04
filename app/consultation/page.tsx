import { ConsultationFlow } from "@/components/consultation-flow";

export default function ConsultationPage() {
  return <ConsultationFlow apiKey={process.env.GOOGLE_MAP_API ?? ""} />;
}
