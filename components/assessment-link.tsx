import Link from "next/link";
import styles from "./assessment-link.module.css";

/** Orange assessment CTA for page content; header/footer keep their own styling. */
export function AssessmentLink({
  className = "",
  arrow = false,
}: {
  className?: string;
  arrow?: boolean;
}) {
  return (
    <Link
      href="/consultation"
      prefetch={false}
      className={`${styles.assessment} ${className}`}
    >
      Get Your Free Assessment{arrow && <span aria-hidden="true">→</span>}
    </Link>
  );
}
