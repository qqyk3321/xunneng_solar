import { z } from "zod";
import { UUID, PRIVACY_VERSION, type ConsultationInput } from "@solortide/consultation-core";
import type { ConsultationPreview } from "@/lib/consultation-preview";
import { emptyValues } from "./draft";

const text = (max: number) => z.string().trim().max(max);
const assessmentValues = z.object({
  name: text(160), email: text(254), phone: text(40), phoneCountry: text(2), address: text(1200), monthlyKwh: z.number().finite(), profile: text(16),
  answers: z.object({ motivations: z.array(z.enum(["bills", "outages", "hurricane", "other"])).max(4), otherMotivation: text(1000), airConditioning: text(1500), wifi: z.enum(["yes", "no", ""]), otherAppliances: text(1500) }).strict(),
}).strict();
export const editSchema = z.object({
  requestId: z.string().regex(UUID), revision: z.number().int().positive(),
  change: z.discriminatedUnion("section", [
    z.object({ section: z.literal("assessment"), values: assessmentValues }).strict(),
    z.object({ section: z.literal("contact"), values: z.object({ name: text(160), email: text(254), phone: text(40), phoneCountry: text(2) }).strict() }).strict(),
    z.object({ section: z.literal("electricity"), values: z.object({ monthlyKwh: z.number().finite(), profile: text(16) }).strict() }).strict(),
    z.object({ section: z.literal("property"), values: z.object({ address: text(1200), answers: z.object({ motivations: z.array(z.enum(["bills", "outages", "hurricane", "other"])).max(4), otherMotivation: text(1000), airConditioning: text(1500), wifi: z.enum(["yes", "no", ""]), otherAppliances: text(1500) }).strict() }).strict() }),
  ]),
}).strict();
export type EditRequest = z.infer<typeof editSchema>;
export type EditSection = EditRequest["change"]["section"];
export function submissionInput(row: Omit<ConsultationPreview, "preview_url">): ConsultationInput {
  return { schemaVersion: 1, country: row.country_code, name: row.name, email: row.email, phone: row.phone,
    phoneCountry: row.phone_country || row.country_code, address: row.address?.full || "", monthlyKwh: row.monthly_kwh || 0,
    profile: row.consumption_profile || "daytime", answers: { ...emptyValues(row.country_code).answers, ...row.answers },
    privacyAccepted: true, privacyVersion: PRIVACY_VERSION };
}
