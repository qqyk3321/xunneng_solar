"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { isKnocketWidgetPath } from "@/lib/knocket-widget";

export function KnocketWidget() {
  const allowed = isKnocketWidgetPath(usePathname());

  useEffect(() => {
    // The SDK has no complete teardown API. A fresh document removes its code
    // and listeners when client navigation leaves the public site.
    if (!allowed && document.getElementById("knocket-widget")) {
      window.location.reload();
    }
  }, [allowed]);

  if (!allowed) return null;
  return (
    <Script
      id="knocket-widget"
      src="https://trtc.io/knocket-sdk/sdk.js?identifier=1b98aa22d69b1693f3&v=1792127892528"
      strategy="afterInteractive"
      async
      referrerPolicy="no-referrer"
    />
  );
}
