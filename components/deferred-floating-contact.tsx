"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const FloatingContact = lazy(async () => {
  const contactModule = await import("./home-contact");
  return {
    default: function DeferredContact({
      initialEmail,
    }: {
      initialEmail?: string;
    }) {
      return (
        <contactModule.HomeContact
          initialEmail={initialEmail}
          variant="floating"
        />
      );
    },
  };
});

/** The help button is useful but not part of the consultation's first paint. */
export function DeferredFloatingContact({
  initialEmail,
}: { initialEmail?: string } = {}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <FloatingContact initialEmail={initialEmail} />
    </Suspense>
  );
}
