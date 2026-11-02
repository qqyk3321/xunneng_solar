"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./private-support-widget.module.css";

/** Keep the support SDK outside the document containing the private assessment. */
export function PrivateSupportWidget() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      // The sandbox has an opaque origin; accept only our own frame window.
      if (event.source !== frame.current?.contentWindow || event.origin !== "null") return;
      if (event.data?.type === "solortide:support-size" && typeof event.data.expanded === "boolean") setExpanded(event.data.expanded);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return <iframe ref={frame} title="Customer support" src="/support/chat.html" referrerPolicy="no-referrer"
    sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
    className={`${styles.frame} ${expanded ? styles.expanded : ""}`} data-support-expanded={expanded} />;
}
