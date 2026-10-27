"use client";

import { useEffect, type RefObject } from "react";

/** Reveal the complete desktop navigation, then widen its rounded shell on scroll. */
export function useDesktopHeaderMorph(
  enabled: boolean,
  header: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const shell = header.current;
    if (!enabled || !shell) return;
    const desktop = window.matchMedia("(min-width: 1001px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let progress = 0;
    let visible = 0;
    let targetProgress = 0;
    let targetVisible = 0;
    let frame = 0;
    let previousTime = 0;
    let focused = false;
    let disposed = false;
    const paint = () => {
      shell.style.setProperty("--header-progress", progress.toFixed(4));
      shell.style.setProperty("--header-visible", visible.toFixed(4));
      shell.toggleAttribute("data-desktop-visible", desktop.matches && visible >= 0.98);
    };
    const animate = (time: number) => {
      const elapsed = Math.min(64, time - (previousTime || time - 16));
      previousTime = time;
      const easing = 1 - Math.exp(-elapsed / 85);
      progress += (targetProgress - progress) * easing;
      visible += (targetVisible - visible) * easing;
      if (Math.abs(targetProgress - progress) < 0.001) progress = targetProgress;
      if (Math.abs(targetVisible - visible) < 0.001) visible = targetVisible;
      paint();
      frame = progress === targetProgress && visible === targetVisible ? 0 : requestAnimationFrame(animate);
    };
    const update = () => {
      if (disposed) return;
      const immediate = !desktop.matches || reduced.matches;
      // First reveal a long, complete navigation bar; only then widen it to the edges.
      targetVisible = immediate || focused ? 1 : Math.min(1, Math.max(0, (window.scrollY - 12) / 44));
      targetProgress = immediate ? 1 : Math.min(1, Math.max(0, (window.scrollY - 80) / 200));
      if (immediate) {
        cancelAnimationFrame(frame);
        frame = 0;
        progress = targetProgress;
        visible = targetVisible;
        paint();
      } else if (!frame) {
        previousTime = 0;
        frame = requestAnimationFrame(animate);
      }
    };
    const focus = () => {
      focused = true;
      // A keyboard user can reach the complete navigation even at the page top.
      visible = 1;
      paint();
      update();
    };
    const blur = () => queueMicrotask(() => {
      focused = shell.contains(document.activeElement) || Boolean(document.querySelector("dialog[open]"));
      update();
    });
    update();
    window.addEventListener("scroll", update, { passive: true });
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    shell.addEventListener("focusin", focus);
    shell.addEventListener("focusout", blur);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
      shell.removeEventListener("focusin", focus);
      shell.removeEventListener("focusout", blur);
    };
  }, [enabled, header]);
}
