"use client";

import { useEffect, useRef } from "react";
import { createSolarVisitReporter } from "@/lib/solution-suggest/visit-client";

export function SolarVisitTracker() {
  const reporter = useRef<ReturnType<typeof createSolarVisitReporter> | null>(null);
  useEffect(() => {
    // Ref survives React Strict Mode's effect replay; refresh/new entry gets
    // a new reporter. Prefetching does not mount this authorized-only component.
    reporter.current ??= createSolarVisitReporter();
    reporter.current.record();
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) reporter.current?.record(true);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);
  return null;
}
