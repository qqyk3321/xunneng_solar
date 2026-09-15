import Link from "next/link";
import { RegionFlag } from "./site-region";
import { COUNTRY_NAMES, regionPath } from "@/lib/site-region-routing";
import styles from "./region-links.module.css";

export function RegionLinks({ suffix = "" }: { suffix?: string }) {
  return (
    <nav
      className={styles.links}
      aria-label="Choose your installation location"
    >
      {(["AG", "DM"] as const).map((country) => (
        <Link key={country} href={regionPath(country, suffix)} prefetch={false}>
          <RegionFlag country={country} /> {COUNTRY_NAMES[country]}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </nav>
  );
}
