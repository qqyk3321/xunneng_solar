import { CountryFaqEntry } from "@/components/country-faq-entry";

export const metadata = {
  title: "Choose Your Country | Sol & Tide Energy",
  robots: { index: false, follow: true },
};

export default function FaqEntryPage() {
  return <CountryFaqEntry />;
}
