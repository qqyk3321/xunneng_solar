import { SITE_CONTACT } from "@/lib/site-contact";
import { SocialBrandIcon } from "./social-brand-icon";

/** One destination switches the shared contact and footer entries on together. */
export function InstagramContact({ iconOnly = false }: { iconOnly?: boolean }) {
  const url = SITE_CONTACT.instagramUrl;
  const content = (
    <>
      <SocialBrandIcon brand="instagram" size={iconOnly ? 18 : 20} />
      {!iconOnly && <span>{url ? "Follow us on Instagram" : "Instagram"}</span>}
    </>
  );

  if (!url) {
    return (
      <span role="link" aria-disabled="true" aria-label="Instagram (link coming soon)" title="Instagram — link coming soon">
        {content}
      </span>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={iconOnly ? "Solortide on Instagram" : undefined} title={iconOnly ? "Instagram" : undefined}>
      {content}
    </a>
  );
}
