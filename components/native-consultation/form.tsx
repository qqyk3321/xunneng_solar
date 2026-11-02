"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PRIVACY_VERSION, UUID, type Country } from "@solortide/consultation-core";
import { inputSchema } from "@/lib/native-consultation/schema";
import { draftKey, emptyValues, newDraft, readDraft, revise, writeDraft, type Draft, type FormValues } from "@/lib/native-consultation/draft";
import { AssessmentCard } from "./assessment-card";
import { AssessmentFields } from "./assessment-fields";
import { RequiredMark } from "./required-mark";
import { SuccessDialog } from "./success-dialog";
import { ConsentDialog, PrivacyStatement } from "./consent-dialog";
import styles from "./form.module.css";

export function NativeConsultationForm({ country }: { country: Country }) {
  const form = useForm<FormValues>({ defaultValues: emptyValues(country) });
  const [draft, setDraft] = useState<Draft | null>(null), draftRef = useRef<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), busyRef = useRef(false), restoring = useRef(false);
  const [cacheAvailable, setCacheAvailable] = useState(true), heading = useRef<HTMLHeadingElement>(null);
  const [consentRevision, setConsentRevision] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const values = form.watch();
  const apply = (next: Draft, restore = false) => {
    draftRef.current = next; setDraft(next);
    if (restore) { restoring.current = true; form.reset(next.values); restoring.current = false; }
  };
  const cache = () => { try { return window.localStorage; } catch { return null; } };
  const persist = (changes: Partial<Draft>) => {
    const current = draftRef.current; if (!current) return null;
    const storage = cache(), latest = storage && readDraft(storage, country);
    if (!latest || latest.revision !== current.revision) {
      setConsentRevision(null);
      const next = latest && latest.phase !== "complete" ? latest : newDraft(country);
      if (next !== latest) setCacheAvailable(!!storage && writeDraft(storage, next));
      apply(next, true); setNotice("Updated in another tab. Review the latest answers."); return null;
    }
    const next = revise(current, changes);
    const saved = !!storage && writeDraft(storage, next);
    setCacheAvailable(saved); apply(next); return saved ? next : null;
  };
  useEffect(() => {
    const storage = cache();
    const restore = () => {
      const stored = storage && readDraft(storage, country);
      // Older versions persisted the success receipt. Only unfinished drafts resume.
      const initial = stored && stored.phase !== "complete" ? stored : newDraft(country);
      setCacheAvailable(!!storage && writeDraft(storage, initial));
      apply(initial, true); setErrors({}); setNotice(""); setConsentRevision(null);
    };
    restore();
    const sync = (event: StorageEvent) => {
      if (event.key !== draftKey(country) && event.key !== null) return;
      if (draftRef.current?.phase === "complete") return;
      const latest = cache() && readDraft(window.localStorage, country);
      if (!latest || latest.phase === "complete") {
        restore();
      } else if (latest.revision !== draftRef.current?.revision) {
        setConsentRevision(null);
        apply(latest, true); setErrors({}); setNotice("Updated from another tab.");
      }
    };
    const revisit = (event: PageTransitionEvent) => { if (event.persisted) restore(); };
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", revisit);
    const subscription = form.watch((_, { name }) => {
      if (!restoring.current && draftRef.current?.phase === "editing") {
        persist({ values: form.getValues() });
        // Clear a corrected field before blur can move the button during a click.
        const key = name === "phoneCountry" ? "phone" : name;
        if (key) setErrors(previous => {
          if (!previous[key]) return previous;
          const parsed = parsedInput();
          const issue = parsed.success ? undefined : parsed.error.issues.find(i => i.path.join(".") === key);
          if (issue?.message === previous[key]) return previous;
          const next = { ...previous };
          if (issue) next[key] = issue.message; else delete next[key];
          return next;
        });
      }
    });
    return () => { subscription.unsubscribe(); window.removeEventListener("storage", sync); window.removeEventListener("pageshow", revisit); };
    // Form initialization is scoped to one region; the route keys this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  const parsedInput = () => inputSchema.safeParse({ ...form.getValues(), monthlyKwh: Number(form.getValues("monthlyKwh")), schemaVersion: 1, country, privacyVersion: PRIVACY_VERSION });
  const validate = ({ contactOnly = false, skipPrivacy = false } = {}) => {
    const parsed = parsedInput();
    const first = ["name", "email", "phone", "phoneCountry", "address"];
    const issues = parsed.success ? [] : parsed.error.issues.filter(i =>
      (!contactOnly || first.includes(String(i.path[0]))) && (!skipPrivacy || i.path[0] !== "privacyAccepted"));
    const next = Object.fromEntries(issues.map(i => [i.path.join("."), i.message])); setErrors(next);
    if (issues.length) {
      const key = String(issues[0].path[0]);
      if (first.includes(key) && draftRef.current?.step === 1) persist({ step: 0 });
      requestAnimationFrame(() => document.getElementById(key)?.focus());
    }
    return { valid: !issues.length, parsed };
  };
  const blur = (key: string) => {
    const parsed = parsedInput(), message = parsed.success ? undefined : parsed.error.issues.find(i => i.path.join(".") === key)?.message;
    setErrors(previous => { const next = { ...previous }; if (message) next[key] = message; else delete next[key]; return next; });
  };
  const move = (step: 0 | 1) => {
    if (draftRef.current?.phase !== "editing") return;
    if (step === 1 && !validate({ contactOnly: true }).valid) return;
    if (persist({ step })) { setNotice(""); requestAnimationFrame(() => { heading.current?.focus(); window.scrollTo({ top: 0, behavior: "instant" }); }); }
  };
  const changeDialogConsent = (accepted: boolean) => {
    if (draftRef.current?.phase !== "editing" || draftRef.current.revision !== consentRevision) { setConsentRevision(null); return; }
    if (!persist({ values: { ...form.getValues(), privacyAccepted: accepted } })) { setConsentRevision(null); return; }
    form.setValue("privacyAccepted", accepted);
    setConsentRevision(draftRef.current.revision);
  };
  const submit = async (confirmedRevision?: string) => {
    if (busyRef.current || !draftRef.current || draftRef.current.phase === "complete") return;
    busyRef.current = true; setBusy(true); setNotice("");
    try {
      let current = draftRef.current;
      if (current.phase === "editing") {
        if (confirmedRevision && confirmedRevision !== current.revision) {
          setConsentRevision(null); setNotice("Your saved assessment changed. Review the latest answers before sending."); return;
        }
        if (!validate({ skipPrivacy: true }).valid) { setConsentRevision(null); return; }
        if (confirmedRevision) {
          setConsentRevision(null);
          if (!persist({ values: { ...form.getValues(), privacyAccepted: true } })) return;
          form.setValue("privacyAccepted", true);
        } else if (!form.getValues("privacyAccepted")) {
          setConsentRevision(current.revision); return;
        }
        const check = validate(); if (!check.valid || !check.parsed.success) return;
        const saved = persist({ phase: "pending", step: 1, frozen: check.parsed.data, values: form.getValues() });
        if (!saved) return; current = saved;
      }
      const storage = cache(), latest = storage && readDraft(storage, country);
      if (!latest || latest.requestId !== current.requestId || latest.revision !== current.revision) {
        if (latest) apply(latest, true);
        setNotice("Your saved assessment changed. Review the latest version before continuing."); return;
      }
      const response = await fetch("/api/consultations", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: current.requestId, input: current.frozen, website: "" }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      // Another tab can already have completed the same request while this response was in flight.
      const newest = cache() && readDraft(window.localStorage, country);
      if (newest && newest.requestId !== current.requestId) { apply(newest, true); setNotice("A newer assessment is open. Its answers have been kept."); return; }
      if (!response.ok) {
        if (response.status === 422) { persist({ phase: "editing", frozen: undefined }); setErrors(result.fields || {}); }
        setNotice(result.error || "We could not confirm the result. Retry this submission safely."); return;
      }
      if (!UUID.test(result.receipt?.id ?? "")) throw Error("Invalid receipt");
      const completed = revise(current, { phase: "complete", receipt: undefined, frozen: undefined, values: emptyValues(country) });
      // Completion belongs only to this live submission. Keep no answers,
      // receipt, or completed state in the draft cache after a confirmed success.
      storage?.removeItem(draftKey(country));
      apply(completed);
    } catch { setNotice("We could not confirm the result. Your answers are saved. Retry to check this same submission."); }
    finally { busyRef.current = false; if (mounted.current) { setBusy(false); } }
  };
  return <div className={styles.page} data-soft-enter="true">
    <SiteHeader variant="form" />
    <main className={styles.main}>
      <AssessmentCard step={draft?.step ?? 0}>
        {!draft ? <p role="status">Loading your assessment…</p> : <>
          <form noValidate inert={draft.phase === "complete"} onSubmit={e => { e.preventDefault(); if (draft.step === 0) move(1); else void submit(); }}>
            {draft.phase === "pending" ? <section className={styles.pending}>
              <h1 ref={heading} tabIndex={-1}>{busy ? "Submitting…" : "Check your submission"}</h1>
              <p>{"Your answers are saved. Checking again won’t create a second assessment."}</p>
              <dl><dt>Name</dt><dd>{draft.values.name}</dd><dt>Email</dt><dd>{draft.values.email}</dd></dl>
            </section> : <AssessmentFields form={form} step={draft.step} errors={errors} onBlur={blur} onBack={() => move(0)} headingRef={heading}>
              {draft.step === 1 && <><label className={styles.consent}><input type="checkbox" id="privacyAccepted" required {...form.register("privacyAccepted")} aria-invalid={!!errors.privacyAccepted} aria-describedby={errors.privacyAccepted ? "privacy-error" : undefined} /><span><PrivacyStatement /><RequiredMark /></span></label>
              {errors.privacyAccepted && <p id="privacy-error" className={styles.error}>{errors.privacyAccepted}</p>}</>}
            </AssessmentFields>}
            {notice && <p className={styles.notice} role="status">{notice}</p>}
            {!cacheAvailable && <p role="alert" className={styles.error}>Browser storage is unavailable. Enable site storage to save your answers and submit.</p>}
            <footer className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={busy || !cacheAvailable || draft.phase === "complete"}>{busy ? <><LoaderCircle size={18} className={styles.spinner} />Submitting…</> : draft.phase === "pending" ? "Check submission" : draft.step === 0 ? "Continue" : "Send assessment"}</button>
            </footer>
          </form>
        </>}
      </AssessmentCard>
    </main>
    <SiteFooter />
    {consentRevision && <ConsentDialog accepted={!!values.privacyAccepted} onChange={changeDialogConsent} onConfirm={() => void submit(consentRevision)} onClose={() => setConsentRevision(null)} />}
    {draft?.phase === "complete" && <SuccessDialog key={draft.requestId} country={country} />}
  </div>;
}
