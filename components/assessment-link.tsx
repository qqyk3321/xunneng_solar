"use client";
import Link from "next/link";
import { useSiteRegion } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import type { ServiceCountry } from "@/lib/consultation-intake";
import styles from "./assessment-link.module.css";

/** Orange assessment CTA for page content; header/footer keep their own styling. */
export function AssessmentLink({
  className = "",
  arrow = false,
  country: explicitCountry,
}: {
  className?: string;
  arrow?: boolean;
  country?: ServiceCountry | null;
}) {
  const { country: contextCountry, choose } = useSiteRegion();
  const country = explicitCountry === undefined ? contextCountry : explicitCountry;
  if (!country) {
    return (
      <button type="button" onClick={() => choose("assessment")} aria-haspopup="dialog" className={`${styles.assessment} ${className}`}>
        Get Your Free Assessment{arrow && <span aria-hidden="true">→</span>}
      </button>
    );
  }
  return (
    <Link
      href={regionPath(country, "/consultation")}
      prefetch={false}
      className={`${styles.assessment} ${className}`}
    >
      Get Your Free Assessment{arrow && <span aria-hidden="true">→</span>}
    </Link>
  );
}
