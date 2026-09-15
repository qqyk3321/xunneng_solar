"use client";
import Link from "next/link";
import { useSiteRegion } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import styles from "./assessment-link.module.css";

/** Orange assessment CTA for page content; header/footer keep their own styling. */
export function AssessmentLink({
  className = "",
  arrow = false,
}: {
  className?: string;
  arrow?: boolean;
}) {
  const { country } = useSiteRegion();
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
