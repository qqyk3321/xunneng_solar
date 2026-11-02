import { SCHEMA_VERSION, UUID, type Answers, type ConsultationInput, type Country, type Receipt } from "@solortide/consultation-core";
export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export type FormValues = {
  name: string; email: string; phone: string; phoneCountry: string; address: string;
  monthlyKwh: string; profile: string; answers: Answers; privacyAccepted: boolean;
};
export type Draft = {
  version: 1; country: Country; requestId: string; revision: string; updatedAt: number;
  step: 0 | 1; phase: "editing" | "pending" | "complete";
  values: FormValues; frozen?: ConsultationInput; receipt?: Receipt;
};
export const draftKey = (country: Country) => `solortide:consultation:v1:${country}`;
export function draftUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // LAN previews use HTTP: randomUUID requires a secure context, getRandomValues does not.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function emptyValues(country: Country): FormValues {
  return { name: "", email: "", phone: "", phoneCountry: country, address: "", monthlyKwh: "", profile: "",
    answers: { motivations: [], otherMotivation: "", airConditioning: "", wifi: "", otherAppliances: "" }, privacyAccepted: false };
}
export function newDraft(country: Country, now = Date.now()): Draft {
  return { version: SCHEMA_VERSION, country, requestId: draftUuid(), revision: draftUuid(), updatedAt: now, step: 0, phase: "editing", values: emptyValues(country) };
}
export function readDraft(storage: Pick<Storage, "getItem">, country: Country, now = Date.now()): Draft | null {
  try {
    const raw = storage.getItem(draftKey(country));
    if (!raw || raw.length > 30_000) return null;
    const d = JSON.parse(raw) as Draft;
    if (d.version !== 1 || d.country !== country || !UUID.test(d.requestId) || !UUID.test(d.revision)
      || !Number.isFinite(d.updatedAt) || d.updatedAt > now + 60_000 || now - d.updatedAt > DRAFT_TTL
      || ![0, 1].includes(d.step) || !["editing", "pending", "complete"].includes(d.phase)) return null;
    const v = d.values;
    if (!v || ["name", "email", "phone", "phoneCountry", "address", "monthlyKwh", "profile"].some(k => typeof v[k as keyof FormValues] !== "string")
      || typeof v.privacyAccepted !== "boolean" || !v.answers || !Array.isArray(v.answers.motivations)
      || ["otherMotivation", "airConditioning", "wifi", "otherAppliances"].some(k => typeof v.answers[k as keyof Answers] !== "string")) return null;
    if (d.phase === "pending" && (!d.frozen || d.frozen.country !== country)) return null;
    if (d.phase === "complete" && (!d.receipt || !UUID.test(d.receipt.id) || typeof d.receipt.reference !== "string"
      || !new RegExp(`^/${country === "AG" ? "antigua" : "dominica"}/submission/[A-Za-z0-9_-]{43}$`).test(d.receipt.previewPath))) return null;
    // Remove retired device coordinates without changing the frozen request or answers.
    delete (d as Draft & { location?: unknown }).location;
    return d;
  } catch { return null; }
}
export function writeDraft(storage: Pick<Storage, "setItem">, draft: Draft): boolean {
  try { storage.setItem(draftKey(draft.country), JSON.stringify(draft)); return true; } catch { return false; }
}
export function revise(draft: Draft, changes: Partial<Draft>): Draft {
  return { ...draft, ...changes, revision: draftUuid(), updatedAt: Date.now() };
}
