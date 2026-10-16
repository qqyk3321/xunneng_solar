"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TransitionEvent } from "react";

type DeckPhase = "waiting" | "opening" | "open" | "closing" | "stacked";

/** Keep shared selection immediate; only the desktop card presentation waits for the fold. */
export function usePackageDeckMotion(targetIndex: number) {
  const deck = useRef<HTMLDivElement>(null);
  const entered = useRef(false);
  const target = useRef(targetIndex);
  const shown = useRef(targetIndex);
  const [displayedIndex, setDisplayedIndex] = useState(targetIndex);
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<DeckPhase>("open");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 801px) and (prefers-reduced-motion: no-preference)");
    const sync = () => {
      const animate = media.matches && "IntersectionObserver" in window;
      setEnabled(animate);
      setPhase(animate && !entered.current ? "waiting" : "open");
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled || entered.current || !deck.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entered.current) { observer.disconnect(); return; }
      if (!entry.isIntersecting || entry.intersectionRatio < .3) return;
      entered.current = true;
      setPhase("opening");
      observer.disconnect();
    }, { threshold: .3, rootMargin: "-100px 0px -48px 0px" });
    observer.observe(deck.current);
    return () => observer.disconnect();
  }, [enabled]);

  useLayoutEffect(() => {
    target.current = targetIndex;
    if (!enabled || !entered.current || phase === "stacked") {
      shown.current = targetIndex;
      setDisplayedIndex(targetIndex);
    } else if (targetIndex !== shown.current && phase !== "closing") {
      setPhase("closing");
    }
  }, [targetIndex, enabled, phase]);

  const finishClosing = useCallback(() => {
    shown.current = target.current;
    setDisplayedIndex(target.current);
    setPhase("stacked");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (phase === "stacked") {
      // Paint the new order while the cards overlap, before fanning them out.
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setPhase("opening"));
      });
      return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
    }
    // Transition events normally advance the phases. These also cover a switch
    // before the first animation frame, when the transform has not moved yet.
    if (phase === "closing") {
      const timer = window.setTimeout(finishClosing, 340);
      return () => window.clearTimeout(timer);
    }
    if (phase === "opening") {
      const timer = window.setTimeout(() => setPhase("open"), 800);
      return () => window.clearTimeout(timer);
    }
  }, [enabled, phase, finishClosing]);

  function onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    const card = event.target as HTMLElement;
    if (!enabled || event.propertyName !== "transform" || !card.hasAttribute("data-package")) return;
    if (phase === "closing" && card.dataset.slot === "center") finishClosing();
    if (phase === "opening" && card.dataset.slot === "right") setPhase("open");
  }

  function onFocusCapture() {
    if (!entered.current) {
      entered.current = true;
      setPhase("open");
    }
  }

  return {
    deck,
    enabled,
    phase: enabled ? phase : "open",
    displayedIndex: enabled ? displayedIndex : targetIndex,
    onTransitionEnd,
    onFocusCapture,
  };
}
