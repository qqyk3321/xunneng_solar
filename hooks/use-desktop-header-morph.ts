"use client";

import { useEffect, type RefObject } from "react";

/** Scroll the desktop shell without re-rendering the navigation on every frame. */
export function useDesktopHeaderMorph(
  enabled: boolean,
  header: RefObject<HTMLElement | null>,
  content: RefObject<HTMLDivElement | null>,
  trigger: RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    const shell = header.current;
    const navigation = content.current;
    const button = trigger.current;
    if (!enabled || !shell || !navigation || !button) return;

    const desktop = window.matchMedia("(min-width: 1001px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let progress = 0;
    let target = 0;
    let frame = 0;
    let previousTime = 0;
    let previousScroll = window.scrollY;
    let opened = false;
    let focusAfterOpening = false;

    const paint = () => {
      const ready = progress >= 0.985;
      shell.style.setProperty("--header-progress", progress.toFixed(4));
      shell.style.setProperty("--header-content", Math.max(0, (progress - 0.82) / 0.18).toFixed(4));
      shell.style.setProperty("--header-strip", Math.min(1, Math.max(0, (0.85 - progress) / 0.3)).toFixed(4));
      shell.toggleAttribute("data-desktop-expanded", desktop.matches && ready);
      button.setAttribute("aria-expanded", String(ready));
      navigation.inert = desktop.matches && !ready;
      if (ready && focusAfterOpening) {
        focusAfterOpening = false;
        navigation.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
      }
      button.inert = !desktop.matches || ready;
    };
    const animate = (time: number) => {
      const elapsed = Math.min(64, time - (previousTime || time - 16));
      previousTime = time;
      progress += (target - progress) * (1 - Math.exp(-elapsed / 85));
      if (Math.abs(target - progress) < 0.001) progress = target;
      paint();
      frame = progress === target ? 0 : window.requestAnimationFrame(animate);
    };
    const update = () => {
      const keyboardFocus = navigation.contains(document.activeElement) && document.activeElement?.matches(":focus-visible");
      target = !desktop.matches || reduced.matches || opened || keyboardFocus
        ? 1
        : Math.min(1, Math.max(0, window.scrollY / 200));
      if (!desktop.matches || reduced.matches) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        progress = target;
        paint();
      } else if (!frame) {
        previousTime = 0;
        frame = window.requestAnimationFrame(animate);
      }
    };
    const scroll = () => {
      if (window.scrollY !== previousScroll) opened = false;
      previousScroll = window.scrollY;
      update();
    };
    const open = () => {
      opened = true;
      // Move focus before the compact control becomes hidden/inert.
      focusAfterOpening = true;
      update();
    };
    const outside = (event: PointerEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.target instanceof Node && !shell.contains(event.target)) {
        opened = false;
        update();
      }
    };
    const focus = () => update();
    const blur = (event: FocusEvent) => {
      const enteringDialog = event.relatedTarget instanceof Element && event.relatedTarget.closest("dialog[open]");
      if (!enteringDialog && (!(event.relatedTarget instanceof Node) || !shell.contains(event.relatedTarget))) opened = false;
      // focusout precedes the browser updating activeElement.
      queueMicrotask(update);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !desktop.matches || reduced.matches || window.scrollY >= 200) return;
      opened = false;
      focusAfterOpening = false;
      shell.removeAttribute("data-desktop-expanded");
      button.inert = false;
      button.focus({ preventScroll: true });
      update();
    };

    paint();
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    button.addEventListener("click", open);
    document.addEventListener("pointerdown", outside);
    shell.addEventListener("focusin", focus);
    shell.addEventListener("focusout", blur);
    shell.addEventListener("keydown", escape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
      button.removeEventListener("click", open);
      document.removeEventListener("pointerdown", outside);
      shell.removeEventListener("focusin", focus);
      shell.removeEventListener("focusout", blur);
      shell.removeEventListener("keydown", escape);
      navigation.inert = false;
    };
  }, [enabled, header, content, trigger]);
}
