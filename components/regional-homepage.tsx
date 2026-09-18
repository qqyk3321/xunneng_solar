import type { ServiceCountry } from "@/lib/consultation-intake";
import { regionOrganization } from "@/lib/region-seo";
import { DemoHomepage } from "./demo-homepage";
import { HomepageContact } from "./homepage-contact";

/** Shared server-rendered content for the two regional homes. */
export function RegionalHomepage({ country }: { country: ServiceCountry }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(regionOrganization(country)).replace(/</g, "\\u003c"),
        }}
      />
      <DemoHomepage
        country={country}
        immersive
        contactSlot={<HomepageContact />}
      />
    </>
  );
}
