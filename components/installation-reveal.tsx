"use client";

import { useEffect } from "react";

/** Enhances the server-rendered timeline without hydrating the section content. */
export function InstallationReveal({ sectionId }: { sectionId: string }) {
  useEffect(() => {
    const section = document.getElementById(sectionId);
    if (
      !section ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );
    section
      .querySelectorAll("[data-installation-step]")
      .forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, [sectionId]);

  return null;
}
