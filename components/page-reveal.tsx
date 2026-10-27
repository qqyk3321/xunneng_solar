"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import styles from "./page-reveal.module.css";

/** Once-only desktop reveals. SSR, small screens and reduced motion stay visible. */
export function PageReveal({ children, className, ...props }: {
  children: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
}) {
  const host = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const desktop = matchMedia("(min-width: 801px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const nodes = Array.from(host.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? []);
    let observer: IntersectionObserver | undefined;
    const show = (node: HTMLElement) => { node.dataset.revealState = "visible"; observer?.unobserve(node); };
    const reset = () => { observer?.disconnect(); nodes.forEach(show); };
    if (desktop.matches && !reduced.matches && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) show(entry.target as HTMLElement); });
      }, { threshold: 0, rootMargin: "0px 0px -32px 0px" });
      nodes.forEach((node, index) => {
        node.style.setProperty("--reveal-delay", node.dataset.reveal === "heading" ? "0ms" : `${index % 3 * 60}ms`);
        const rect = node.getBoundingClientRect();
        if (rect.top < innerHeight - 32) show(node);
        else { node.dataset.revealState = "waiting"; observer?.observe(node); }
      });
    }
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element) {
        const node = event.target.closest<HTMLElement>("[data-reveal]");
        if (node) show(node);
      }
    };
    const element = host.current;
    element?.addEventListener("focusin", focus);
    desktop.addEventListener("change", reset);
    reduced.addEventListener("change", reset);
    return () => {
      reset();
      element?.removeEventListener("focusin", focus);
      desktop.removeEventListener("change", reset);
      reduced.removeEventListener("change", reset);
    };
  }, []);
  return <main {...props} ref={host} className={`${className ?? ""} ${styles.scope}`}>{children}</main>;
}
