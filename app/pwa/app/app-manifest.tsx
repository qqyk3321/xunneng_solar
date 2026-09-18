"use client";

import { useEffect } from "react";

export default function AppManifest() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/pwa/manifest.webmanifest";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
  return null;
}
