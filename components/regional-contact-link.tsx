"use client";

import Link from "next/link";
import { regionPath } from "@/lib/site-region-routing";
import { useSiteRegion } from "./site-region";

export function RegionalContactLink() {
  const { country } = useSiteRegion();
  return (
    <Link
      href={country ? `${regionPath(country)}#contact-us` : "/#countries"}
      prefetch={false}
    >
      {country ? "Contact us form" : "Choose your location to contact us"}
    </Link>
  );
}
