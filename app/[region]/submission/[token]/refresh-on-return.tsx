"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => { if (event.persisted) router.refresh(); };
    window.addEventListener("pageshow", refresh);
    return () => window.removeEventListener("pageshow", refresh);
  }, [router]);
  return null;
}
