"use client";

import { useEffect, useState } from "react";
import { DeferredFloatingContact } from "@/components/deferred-floating-contact";
import styles from "./preview.module.css";

/** Keep the mobile overview clear while its inline WhatsApp action is nearby. */
export function SubmissionFloatingContact({ initialEmail }: { initialEmail: string }) {
  const [overviewVisible, setOverviewVisible] = useState(true);

  useEffect(() => {
    const overview = document.getElementById("submission-overview");
    if (!overview) return;
    const observer = new IntersectionObserver(([entry]) => {
      setOverviewVisible(entry.isIntersecting);
    });
    observer.observe(overview);
    return () => observer.disconnect();
  }, []);

  return <div className={styles.floatingContact} data-overview-visible={overviewVisible || undefined}>
    <DeferredFloatingContact initialEmail={initialEmail} />
  </div>;
}
