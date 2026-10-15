import Image from "next/image";

type SocialBrand = "facebook" | "whatsapp" | "messenger" | "instagram";

/** Unmodified primary icons from Meta's official brand resource packs. */
export function SocialBrandIcon({ brand, size = 22 }: { brand: SocialBrand; size?: number }) {
  if (brand === "instagram") {
    return (
      <Image
        src="/contact/social-icons/instagram.png"
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        data-social-brand={brand}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Small, locally hosted brand assets.
    <img
      src={`/contact/social-icons/${brand}.${brand === "facebook" ? "png" : "svg"}`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      data-social-brand={brand}
    />
  );
}
