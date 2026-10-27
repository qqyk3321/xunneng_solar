"use client";

import { useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import styles from "./hero-entrance.module.css";

/** Progressive enhancement: server-rendered content and actions always remain usable. */
export function HeroEntrance({ className, children, ...props }: ComponentPropsWithoutRef<"section">) {
  const section = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState("idle");

  useLayoutEffect(() => {
    const desktop = window.matchMedia("(min-width: 801px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let started = false;
    let timer = 0;
    const finish = () => { window.clearTimeout(timer); setPhase("done"); };
    const enter = () => {
      if (started) return;
      started = true;
      const bounds = section.current?.getBoundingClientRect();
      if (!desktop.matches || reduced.matches || !bounds || bounds.bottom < window.innerHeight / 2) {
        finish();
        return;
      }
      setPhase("entering");
      timer = window.setTimeout(finish, 1000);
    };
    if (desktop.matches && !reduced.matches && document.documentElement.dataset.siteLoading) {
      setPhase("waiting");
    } else {
      enter();
    }
    // The loading watchdog can also remove the attribute without dispatching an event.
    const observer = new MutationObserver(() => {
      if (!document.documentElement.dataset.siteLoading) enter();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-site-loading"] });
    const stop = () => { started = true; finish(); };
    desktop.addEventListener("change", stop);
    reduced.addEventListener("change", stop);
    window.addEventListener("solortide:navigation-end", enter);
    section.current?.addEventListener("focusin", stop);
    const element = section.current;
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      desktop.removeEventListener("change", stop);
      reduced.removeEventListener("change", stop);
      window.removeEventListener("solortide:navigation-end", enter);
      element?.removeEventListener("focusin", stop);
    };
  }, []);

  return <section {...props} ref={section} className={`${className ?? ""} ${styles.scope}`} data-hero-motion={phase}>{children}</section>;
}
