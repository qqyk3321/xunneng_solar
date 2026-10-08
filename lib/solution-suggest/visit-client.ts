type ReporterOptions = {
  send?: typeof fetch;
  createId?: () => string;
  isActive?: () => boolean;
};

/** One attempt per actual page entry; retries/re-renders must never resubmit. */
export function createSolarVisitReporter({
  send = (...args) => fetch(...args),
  createId = () => crypto.randomUUID(),
  isActive = () => window.location.pathname === "/solution-suggest",
}: ReporterOptions = {}) {
  let attempted = false;
  return {
    record(restoredFromCache = false) {
      if (restoredFromCache) attempted = false;
      if (attempted || !isActive()) return;
      attempted = true;
      try {
        void send("/solution-suggest/visit", {
          method: "POST",
          credentials: "same-origin",
          mode: "same-origin",
          cache: "no-store",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: createId() }),
          signal: AbortSignal.timeout(6000),
        }).catch(() => undefined);
      } catch {
        // Missing browser capability / network failure must not affect analysis.
      }
    },
  };
}
