import { getImageProps } from "next/image";

export function RegionalHeroArt({ country, className }: { country: "AG" | "DM"; className?: string }) {
  const island = country === "AG" ? "antigua" : "dominica";
  const common = { alt: `${country === "AG" ? "Antigua" : "Dominica"}-inspired coastal home with rooftop solar; artistic illustration`, fill: true, sizes: "100vw", quality: 78, className };
  const desktop = getImageProps({ ...common, src: `/images/${island}-solar-hero-clean-v2.webp` }).props;
  const mobile = getImageProps({ ...common, src: `/images/${island}-solar-map-hero-no-labels.webp` }).props;
  return <>
    <link rel="preload" as="image" media="(min-width: 801px)" imageSrcSet={desktop.srcSet} imageSizes="100vw" fetchPriority="high" />
    <link rel="preload" as="image" media="(max-width: 800px)" imageSrcSet={mobile.srcSet} imageSizes="100vw" fetchPriority="high" />
    <picture>
      <source media="(min-width: 801px)" srcSet={desktop.srcSet} sizes="100vw" />
      {/* getImageProps provides optimized, responsive sources for both breakpoints. */}
      <img {...mobile} loading="eager" fetchPriority="high" data-hero-background alt={common.alt} />
    </picture>
  </>;
}
