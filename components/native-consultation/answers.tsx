"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check, LoaderCircle, Pencil } from "lucide-react";
import { answerEntries, PROFILE_LABELS } from "@solortide/consultation-core";
import type { ConsultationPreview } from "@/lib/consultation-preview";
import { inputSchema } from "@/lib/native-consultation/schema";
import { editSchema, submissionInput, type EditRequest } from "@/lib/native-consultation/edit-schema";
import { draftUuid, type FormValues } from "@/lib/native-consultation/draft";
import { AssessmentCard } from "./assessment-card";
import { AssessmentFields } from "./assessment-fields";
import formStyles from "./form.module.css";
import styles from "./answers.module.css";

type EditDraft = { section: string; revision: number; step?: 0 | 1; values: FormValues; updatedAt: number; pending?: EditRequest };
const fromRow = (row: ConsultationPreview): FormValues => ({ ...submissionInput(row), monthlyKwh: String(row.monthly_kwh ?? "") });
const contactFields = ["name", "email", "phone", "phoneCountry", "address"];

export function NativeAnswers({ submission, token, editable = false }: { submission: ConsultationPreview; token: string; editable?: boolean }) {
  const router = useRouter();
  const [row, setRow] = useState(submission), [draft, setDraft] = useState<EditDraft | null>(null);
  const draftRef = useRef<EditDraft | null>(null), restoring = useRef(false);
  const form = useForm<FormValues>({ defaultValues: fromRow(submission) });
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), busyRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false), [conflict, setConflict] = useState(false);
  const [access, setAccess] = useState(editable), [storageAvailable, setStorageAvailable] = useState(true);
  const root = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), editButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [saved]);
  const cacheKey = `solortide:edit:v1:${submission.consultation_id}`;
  useEffect(() => { setRow(submission); setAccess(editable); }, [submission, editable]);
  const persist = (next: EditDraft | null) => {
    draftRef.current = next; setDraft(next);
    try { if (next) sessionStorage.setItem(cacheKey, JSON.stringify(next)); else sessionStorage.removeItem(cacheKey); setStorageAvailable(true); return true; }
    catch { setStorageAvailable(false); return false; }
  };
  const reset = (values: FormValues) => { restoring.current = true; form.reset(values); restoring.current = false; };
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw && raw.length < 40_000) {
        const value = JSON.parse(raw) as EditDraft, v = value.values;
        if (value && ["contact", "electricity", "property", "assessment"].includes(value.section) && Number.isInteger(value.revision) && value.revision > 0
          && Date.now() - value.updatedAt < 7 * 86400_000 && value.updatedAt <= Date.now() + 60_000
          && (value.step === undefined || value.step === 0 || value.step === 1)
          && v && ["name", "email", "phone", "phoneCountry", "address", "monthlyKwh", "profile"].every(k => typeof v[k as keyof FormValues] === "string")
          && v.answers && Array.isArray(v.answers.motivations) && ["otherMotivation", "airConditioning", "wifi", "otherAppliances"].every(k => typeof v.answers[k as keyof typeof v.answers] === "string")
          && (!value.pending || (editSchema.safeParse(value.pending).success && value.pending.revision === value.revision))) {
          if (editable) { const next = { ...value, step: value.step ?? (value.section === "electricity" ? 1 : 0) as 0 | 1 }; draftRef.current = next; setDraft(next); reset(v); }
        } else sessionStorage.removeItem(cacheKey);
      }
    } catch { setStorageAvailable(false); }
    setReady(true);
    const subscription = form.watch((_, { name }) => {
      const current = draftRef.current;
      if (!restoring.current && current && !current.pending && !busyRef.current) {
        persist({ ...current, values: form.getValues(), updatedAt: Date.now() });
        if (name) setErrors(previous => { const next = { ...previous }; delete next[name === "phoneCountry" ? "phone" : name]; return next; });
        setMessage("");
      }
    });
    return () => subscription.unsubscribe();
    // A saved editor belongs to one record and an authenticated editing grant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, editable, form]);
  const focusHeading = () => requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); root.current?.scrollIntoView({ block: "start" }); });
  const begin = () => {
    setErrors({}); setMessage(""); setSaved(false); setConflict(false);
    const values = fromRow(row); reset(values);
    persist({ section: "assessment", revision: row.revision || 1, step: 0, values, updatedAt: Date.now() }); focusHeading();
  };
  const finish = () => { persist(null); setErrors({}); setMessage(""); setConflict(false); requestAnimationFrame(() => editButton.current?.focus({ preventScroll: true })); };
  const parsedInput = () => inputSchema.safeParse({ ...submissionInput(row), ...form.getValues(), monthlyKwh: Number(form.getValues("monthlyKwh")), privacyAccepted: true });
  const showErrors = (fields: Record<string, string>) => {
    setErrors(fields);
    const first = Object.keys(fields)[0];
    if (first && draftRef.current) {
      persist({ ...draftRef.current, step: contactFields.includes(first) ? 0 : 1 });
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }
  };
  const blur = (key: string) => {
    const parsed = parsedInput(), error = parsed.success ? undefined : parsed.error.issues.find(i => i.path.join(".") === key)?.message;
    setErrors(previous => { const next = { ...previous }; if (error) next[key] = error; else delete next[key]; return next; });
  };
  const move = (step: 0 | 1) => {
    const current = draftRef.current; if (!current || current.pending || busyRef.current) return;
    if (step === 1) {
      const parsed = parsedInput();
      const issues = parsed.success ? [] : parsed.error.issues.filter(i => contactFields.includes(String(i.path[0])));
      if (issues.length) { showErrors(Object.fromEntries(issues.map(i => [i.path.join("."), i.message]))); return; }
    }
    persist({ ...current, step }); setErrors({}); setMessage(""); focusHeading();
  };
  const save = async () => {
    const current = draftRef.current; if (!current || busyRef.current) return;
    let request = current.pending;
    if (!request) {
      const parsed = parsedInput();
      if (!parsed.success) { showErrors(Object.fromEntries(parsed.error.issues.map(i => [i.path.join("."), i.message]))); return; }
      const { name, email, phone, phoneCountry, address, monthlyKwh, profile, answers } = parsed.data;
      request = { requestId: draftUuid(), revision: current.revision, change: { section: "assessment", values: { name, email, phone, phoneCountry, address, monthlyKwh, profile, answers } } };
      if (!persist({ ...current, section: "assessment", pending: request, updatedAt: Date.now() })) return;
    }
    busyRef.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/consultations/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      if (!response.ok) {
        if ([409, 422, 403].includes(response.status)) persist({ ...current, pending: undefined });
        if (response.status === 409) setConflict(true);
        if (response.status === 403) setAccess(false);
        if (result.fields) showErrors(result.fields);
        setMessage(result.error || "Unable to save. Try again."); return;
      }
      setRow(result.submission); finish(); setSaved(true); router.refresh();
    } catch { setMessage("The result could not be confirmed. Retry saving to check the same update."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const loadLatest = async (keepEdits: boolean) => {
    const current = draftRef.current; if (!current || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const response = await fetch(`/api/consultations/${token}`, { cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw Error(result.error || "Could not load the latest details.");
      setRow(result.submission);
      const values = keepEdits ? current.values : fromRow(result.submission);
      reset(values); persist({ ...current, values, revision: result.submission.revision, pending: undefined, updatedAt: Date.now() });
      setConflict(false); setMessage(keepEdits ? "Your edits are kept. Review this section, then save again." : "Latest details loaded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please retry."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const field = (label: string, value: string, wide = false, testId?: string) => <div className={wide ? styles.wide : undefined} key={label}><dt>{label}</dt><dd data-testid={testId}>{value || "Not provided"}</dd></div>;
  return <div ref={root} className={styles.root}>
    {saved && createPortal(<div className={styles.saved} role="status"><Check size={15} aria-hidden="true" />Saved</div>, document.body)}
    {draft && access ? <AssessmentCard step={draft.step ?? 0}>
      <form noValidate onSubmit={e => { e.preventDefault(); if (draft.pending || draft.step === 1) void save(); else move(1); }}>
        <fieldset disabled={busy || !!draft.pending} className={styles.fields}>
          <AssessmentFields form={form} step={draft.step ?? 0} errors={errors} onBlur={blur} onBack={() => move(0)} headingRef={heading} />
        </fieldset>
        {!storageAvailable && <p className={formStyles.error} role="alert">Allow site storage to keep your edits and save.</p>}
        {message && <p className={styles.notice} role="status">{message}</p>}
        {conflict ? <div className={styles.actions}><button type="button" className={formStyles.primary} disabled={busy} onClick={() => void loadLatest(true)}>Keep my edits</button><button type="button" className={styles.textAction} disabled={busy} onClick={() => void loadLatest(false)}>Load latest details</button></div>
          : <footer className={styles.actions}><button type="button" className={styles.textAction} onClick={finish} disabled={busy || !!draft.pending}>Cancel</button><button type="submit" className={formStyles.primary} disabled={busy || !storageAvailable}>{busy ? <><LoaderCircle size={16} className={formStyles.spinner} />Saving…</> : draft.pending ? "Retry save" : draft.step === 1 ? "Save changes" : "Continue"}</button></footer>}
      </form>
    </AssessmentCard> : <section className={styles.summary} aria-labelledby="submitted-details-title">
      <header className={styles.heading}><h2 id="submitted-details-title">Your details</h2>
        {access && <button ref={editButton} type="button" className={styles.textAction} disabled={!ready} onClick={begin}><Pencil size={14} aria-hidden="true" />Edit details</button>}
      </header>
      {!access && draft && <p className={styles.notice}>Open the QR code in your assessment email to continue editing.</p>}
      <section className={styles.group} aria-labelledby="details-contact"><div className={styles.groupHeading}><h3 id="details-contact">Contact details</h3></div><dl className={styles.values}>
        {field("Full name", row.name, true)}{field("Email", row.email)}{field("Phone", row.phone)}{field("Installation address", row.address?.full || "", true)}
      </dl></section>
      <section className={styles.group} aria-labelledby="details-electricity"><div className={styles.groupHeading}><h3 id="details-electricity">Electricity</h3></div><dl className={styles.values}>
        {field("Highest monthly use", `${row.monthly_kwh?.toLocaleString("en-US")} kWh`, false, "submission-monthly-kwh")}{field("Daily pattern", row.consumption_profile ? PROFILE_LABELS[row.consumption_profile][0] : "", false, "submission-energy-profile")}
      </dl></section>
      {answerEntries(row.answers || {}).length > 0 && <section className={styles.group} aria-labelledby="details-property"><div className={styles.groupHeading}><h3 id="details-property">Property details</h3></div><dl className={styles.values}>{answerEntries(row.answers || {}).map(([label, value]) => field(label, value))}</dl></section>}
    </section>}
  </div>;
}
