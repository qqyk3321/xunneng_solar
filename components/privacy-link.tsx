import type { ReactNode } from "react";

/** A shared policy opens separately so region and unfinished forms stay intact. */
export function PrivacyLink({
  children = "Privacy policy",
  section,
  className,
}: {
  children?: ReactNode;
  section?: "cookies";
  className?: string;
}) {
  return (
    <a
      href={section ? `/privacy#${section}` : "/privacy"}
      target="_blank"
      rel="noopener"
      className={className}
      title="Opens in a new tab"
    >
      {children}
    </a>
  );
}
