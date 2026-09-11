import { HomeContact } from "./home-contact";

/** The same anonymous inquiry form is available on the public homepage and FAQ. */
export function HomepageContact({
  variant = "contact",
}: { variant?: "contact" | "question" } = {}) {
  return <HomeContact variant={variant} />;
}
