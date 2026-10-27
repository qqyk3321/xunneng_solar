"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Use the viewport, including inside sections whose overflow clips their artwork. */
export function useHeadingScroll(host: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const desktop = matchMedia("(min-width: 1001px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const selector = '[data-reveal^="heading"], [id="contact-heading"]';
    let nodes = Array.from(element.querySelectorAll<HTMLElement>(selector));
    const offsets = new WeakMap<HTMLElement, number>();
    let frame = 0;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const paint = () => {
      frame = 0;
      if (!desktop.matches || reduced.matches) return;
      // Read all geometry first, then write styles to avoid repeated layout work.
      const values = nodes.map(node => {
        const rect = node.getBoundingClientRect();
        const offset = offsets.get(node) ?? 0;
        const enter = clamp((innerHeight - rect.top + offset) / 140);
        const leave = clamp((rect.bottom - offset - 68) / 100);
        return { node, opacity: Math.min(enter, leave), offset: (1 - enter) * 12 - (1 - leave) * 8 };
      });
      values.forEach(({ node, opacity, offset }) => {
        node.style.setProperty("--heading-opacity", opacity.toFixed(3));
        node.style.setProperty("--heading-offset", `${offset.toFixed(2)}px`);
        offsets.set(node, offset);
      });
    };
    const schedule = () => {
      if (!frame && desktop.matches && !reduced.matches) frame = requestAnimationFrame(paint);
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      const enabled = desktop.matches && !reduced.matches;
      element.toggleAttribute("data-heading-scroll", enabled);
      nodes.forEach(node => {
        node.style.removeProperty("--heading-opacity");
        node.style.removeProperty("--heading-offset");
        offsets.delete(node);
      });
      if (enabled) paint();
    };
    const additions = new MutationObserver(records => {
      if (!records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element))) return;
      nodes = Array.from(element.querySelectorAll<HTMLElement>(selector));
      schedule();
    });
    const resize = new ResizeObserver(schedule);
    additions.observe(element, { childList: true, subtree: true });
    resize.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    desktop.addEventListener("change", reset);
    reduced.addEventListener("change", reset);
    reset();
    return () => {
      additions.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      desktop.removeEventListener("change", reset);
      reduced.removeEventListener("change", reset);
      element.removeAttribute("data-heading-scroll");
      nodes.forEach(node => {
        node.style.removeProperty("--heading-opacity");
        node.style.removeProperty("--heading-offset");
      });
    };
  }, [host]);
}
