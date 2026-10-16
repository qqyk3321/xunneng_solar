/** Private quotation links must never be passed to the third-party widget. */
export function isKnocketWidgetPath(pathname: string | null): boolean {
  return pathname === "/" || pathname === "/privacy" ||
    /^\/(antigua|dominica)(\/(faq|how-it-works|consultation))?\/?$/.test(pathname ?? "");
}
