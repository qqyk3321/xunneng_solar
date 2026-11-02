/** Private quotation links must never be passed to the third-party widget. */
export function isKnocketWidgetPath(pathname: string | null): boolean {
  return pathname === "/" || pathname === "/privacy" ||
    /^\/(antigua|dominica)(\/(faq|how-it-works|consultation))?\/?$/.test(pathname ?? "");
}

/** Private pages use an opaque sandbox instead of the top-level SDK. */
export function isPrivateSupportPath(pathname: string | null): boolean {
  return /^\/(antigua|dominica)\/submission\/[^/]+\/?$/.test(pathname ?? "");
}
