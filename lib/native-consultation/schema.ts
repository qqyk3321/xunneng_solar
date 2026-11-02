import { z } from "zod";
import { parsePhoneNumberFromString, isSupportedCountry, type CountryCode } from "libphonenumber-js/max";
import { PRIVACY_VERSION, PREVIOUS_PRIVACY_VERSION, LEGACY_PRIVACY_VERSION, UUID, type ConsultationInput } from "@solortide/consultation-core";

const shortText = (max: number) => z.string().trim().max(max);
export const inputSchema = z.object({
  schemaVersion: z.literal(1), country: z.enum(["AG", "DM"]),
  name: shortText(160).min(2, "Enter your full name."),
  email: shortText(254).pipe(z.email("Enter a valid email address.")),
  phone: shortText(40).refine(value => value.startsWith("+") && !!parsePhoneNumberFromString(value)?.isValid(), "Check the country and enter a valid phone number."), phoneCountry: z.string().length(2),
  address: shortText(1200).min(8, "Enter your full installation address."),
  monthlyKwh: z.number().finite().positive("Enter your highest monthly electricity use.").max(1_000_000),
  profile: z.enum(["daytime", "rush", "evening", "night"], { error: "Choose your electricity use pattern." }),
  answers: z.object({
    motivations: z.array(z.enum(["bills", "outages", "hurricane", "other"])).max(4).transform(v => [...new Set(v)].sort()),
    otherMotivation: shortText(1000), airConditioning: shortText(1500),
    wifi: z.enum(["yes", "no", ""]), otherAppliances: shortText(1500),
  }).strict(),
  privacyAccepted: z.literal(true, { error: "Please agree to the privacy notice." }),
  privacyVersion: z.enum([PRIVACY_VERSION, PREVIOUS_PRIVACY_VERSION, LEGACY_PRIVACY_VERSION]),
}).strict().superRefine((value, ctx) => {
  const country = value.phoneCountry as CountryCode;
  const number = isSupportedCountry(country) ? parsePhoneNumberFromString(value.phone, country) : undefined;
  if (!number?.isValid() || (number.country && number.country !== country)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Check the country and enter a valid phone number." });
  }
}).transform(value => ({ ...value, phone: parsePhoneNumberFromString(value.phone, value.phoneCountry as CountryCode)!.number }) as ConsultationInput);
export const submissionSchema = z.object({
  requestId: z.string().regex(UUID), input: inputSchema, website: z.literal(""), // Discard retired metadata from already-open clients; never pass it to storage.
  location: z.unknown().optional().transform(() => undefined),
}).strict();

export function emailSuggestion(email: string) {
  const corrections: Record<string, string> = { "gamil.com": "gmail.com", "gmial.com": "gmail.com", "gmail.con": "gmail.com", "hotmal.com": "hotmail.com", "outlok.com": "outlook.com" };
  const at = email.lastIndexOf("@"), corrected = corrections[email.slice(at + 1).toLowerCase()];
  return at > 0 && corrected ? `${email.slice(0, at)}@${corrected}` : null;
}
