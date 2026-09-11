"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

/** Same-page navigation with native-link fallback and reduced-motion support. */
export function SectionAnchor({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: `#${string}` }) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    event.preventDefault();
    window.history.pushState(null, "", href);
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  return (
    <a {...props} href={href} onClick={navigate}>
      {children}
    </a>
  );
}
