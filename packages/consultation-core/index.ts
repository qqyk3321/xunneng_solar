export const SCHEMA_VERSION = 1;
export const PRIVACY_VERSION = "2026-10-30-native-v3";
export const PREVIOUS_PRIVACY_VERSION = "2026-10-30-native-v2";
export const LEGACY_PRIVACY_VERSION = "2026-10-29-native-v1";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isSubmissionId = (value: string) => UUID.test(value);
export const PROFILE_LABELS = {
  daytime: ["Daytime use", "白天用电"], rush: ["Morning & evening peaks", "白天高峰"],
  evening: ["Evening peak", "傍晚高峰"], night: ["Nighttime peak", "夜间高峰"],
} as const;
export const MOTIVATIONS = {
  bills: ["Lower electricity bills", "降低电费"], outages: ["Power during grid outages", "停电备用"],
  hurricane: ["Backup for hurricane season", "飓风季备用"], other: ["Something else", "其他需求"],
} as const;
export type Country = "AG" | "DM";
export type Profile = keyof typeof PROFILE_LABELS;
export type Motivation = keyof typeof MOTIVATIONS;
export type Answers = { motivations: Motivation[]; otherMotivation: string; airConditioning: string; wifi: "yes" | "no" | ""; otherAppliances: string };
export type ConsultationInput = {
  schemaVersion: 1; country: Country; name: string; email: string; phone: string; phoneCountry: string;
  address: string; monthlyKwh: number; profile: Profile; answers: Answers;
  privacyAccepted: true; privacyVersion: typeof PRIVACY_VERSION | typeof PREVIOUS_PRIVACY_VERSION | typeof LEGACY_PRIVACY_VERSION;
};
export type Receipt = { id: string; reference: string; submittedAt: string; previewPath: string };
export type ConsultationRecord = {
  id: string; consultation_id: string; source: "native";
  submission_id: string; submitted_at: string; country_code: Country;
  name: string; email: string; phone: string; phone_country: string | null;
  address: Record<string, string | null>; monthly_kwh: number | null;
  consumption_profile: Profile | null; answers: Answers | Record<string, unknown>;
  schema_version: number;
};
export function answerEntries(answers: Record<string, unknown>, locale: "en" | "zh" = "en") {
  const index = locale === "en" ? 0 : 1;
  const text = (value: unknown) => typeof value === "string" ? value : "";
  return [
    [index ? "安装动机" : "What matters to you", Array.isArray(answers.motivations) ? answers.motivations.map(m => typeof m === "string" && m in MOTIVATIONS ? MOTIVATIONS[m as Motivation][index] : "").filter(Boolean).join(", ") : ""],
    [index ? "其他需求" : "Other priorities", text(answers.otherMotivation)],
    [index ? "空调情况" : "Air conditioning", text(answers.airConditioning)],
    [index ? "Wi-Fi" : "Wi-Fi available", answers.wifi === "yes" ? (index ? "有" : "Yes") : answers.wifi === "no" ? (index ? "无" : "No") : ""],
    [index ? "其他电器" : "Other appliances", text(answers.otherAppliances)],
  ].filter(([, value]) => value) as [string, string][];
}
