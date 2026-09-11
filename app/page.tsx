import { DemoHomepage } from "@/components/demo-homepage";
import { HomepageContact } from "@/components/homepage-contact";

export default function HomePage() {
  return <DemoHomepage contactSlot={<HomepageContact />} />;
}
