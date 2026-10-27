import { getImageProps } from "next/image";
import { ISLAND_COVERAGE } from "@/data/island-coverage";
import styles from "./regional-hero-art.module.css";

export function RegionalHeroArt({ country, className }: { country: "AG" | "DM"; className?: string }) {
  const island = country === "AG" ? "antigua" : "dominica";
  const common = { alt: `${country === "AG" ? "Antigua" : "Dominica"}-inspired coastal home with rooftop solar; artistic illustration`, fill: true, sizes: "100vw", quality: 78, className };
  const desktop = getImageProps({ ...common, src: `/images/${island}-solar-hero-clean-v2.webp` }).props;
  const mobile = getImageProps({ ...common, src: `/images/${island}-solar-map-hero-no-labels.webp` }).props;
  const shape = ISLAND_COVERAGE.find(entry => entry.code === country)!.shape;
  // The regional illustration shows Antigua and Barbuda; omit tiny Redonda here.
  const paths = shape.split(/(?=M)/).filter(path => country !== "AG" || !path.startsWith("M985"));
  return <>
    <link rel="preload" as="image" media="(min-width: 801px)" imageSrcSet={desktop.srcSet} imageSizes="100vw" fetchPriority="high" />
    <link rel="preload" as="image" media="(max-width: 800px)" imageSrcSet={mobile.srcSet} imageSizes="100vw" fetchPriority="high" />
    <picture>
      <source media="(min-width: 801px)" srcSet={desktop.srcSet} sizes="100vw" />
      {/* getImageProps provides optimized, responsive sources for both breakpoints. */}
      <img {...mobile} loading="eager" fetchPriority="high" data-hero-background alt={common.alt} />
    </picture>
    <svg className={styles.outline} data-country={country} data-island-outline viewBox={country === "AG" ? "1003 535 14 30" : "1028 610 15 19"} aria-hidden="true" focusable="false">
      {paths.map((path, index) => <path key={index} d={path} pathLength="1" />)}
    </svg>
  </>;
}
