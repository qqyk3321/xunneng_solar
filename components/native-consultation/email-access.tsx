"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConsultationPreview } from "@/lib/consultation-preview";
import { NativeAnswers } from "./answers";
import styles from "./form.module.css";

export function EmailAssessment({ submission, token, editable }: { submission: ConsultationPreview; token: string; editable: boolean }) {
  const [access, setAccess] = useState(editable);
  useEffect(() => { setAccess(editable); }, [editable]);
  const granted = useCallback(() => setAccess(true), []);
  return <><EmailAssessmentAccess token={token} onGranted={granted} /><NativeAnswers submission={submission} token={token} editable={access} /></>;
}

function EmailAssessmentAccess({ token, onGranted }: { token: string; onGranted: () => void }) {
  const credential = useRef("");
  const lock = useRef(false);
  const [status, setStatus] = useState<"idle" | "opening" | "error" | "invalid">("idle");
  const [error, setError] = useState("");
  const open = useCallback(async () => {
    if (lock.current || !credential.current) return;
    lock.current = true; setStatus("opening");
    try {
      const response = await fetch(`/api/consultations/${token}/access`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credential.current }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to open editing. Please try again.");
        setStatus([400, 403, 404].includes(response.status) ? "invalid" : "error"); return;
      }
      // Confirm that this browser accepted the HttpOnly device cookie before
      // enabling the editor. No page navigation or competing router refresh.
      const verified = await fetch(`/api/consultations/${token}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!verified.ok) {
        setError(verified.status === 403 ? "Allow cookies for this site, then try again." : "Unable to confirm editing access. Please try again.");
        setStatus("error"); return;
      }
      // Let Next synchronize its canonical URL, so later saves/refreshes do not
      // restore the private fragment from the router's old history state.
      history.replaceState(null, "", location.pathname + location.search);
      credential.current = ""; setStatus("idle"); onGranted();
    } catch { setError("Unable to open editing. Please try again."); setStatus("error"); }
    finally { lock.current = false; }
  }, [onGranted, token]);
  useEffect(() => {
    const hash = new URLSearchParams(location.hash.slice(1));
    const value = hash.get("edit");
    if (!value) return;
    credential.current = value;
    void open();
  }, [open]);
  if (status === "idle") return null;
  return <div className={styles.notice} role="status">
    {status === "opening" ? "Opening your assessment for editing…" : <>{error}{status === "error" && <div><button type="button" className={styles.textButton} onClick={() => void open()}>Try again</button></div>}</>}
  </div>;
}
