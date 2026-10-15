// Stable option IDs prevent the former electrical-supply question (same key)
// from being mistaken for a daily consumption profile.
export const PROFILE_OPTIONS = {
  "ecfeae73-90ed-4ddc-93dd-b8994fee7603": "daytime",
  "15eb5973-1763-4976-81a4-bcd5ce76b8c8": "rush",
  "b25c9d74-b218-4093-ab72-838b17fbf964": "evening",
  "be5b008b-534f-4efe-b0e8-e4a73bd48f1e": "night",
} as const;
export type ConsumptionProfile = (typeof PROFILE_OPTIONS)[keyof typeof PROFILE_OPTIONS];

export function parseEnergyInput(monthly: unknown, profile: unknown) {
  const monthlyKwh = typeof monthly === "number" ? monthly
    : typeof monthly === "string" && /^\d+(?:\.\d+)?$/.test(monthly.trim()) ? Number(monthly) : NaN;
  if (!Number.isFinite(monthlyKwh) || monthlyKwh <= 0 || monthlyKwh > 1000000)
    throw new Error("Invalid monthly electricity use");
  if (!Array.isArray(profile) || profile.length !== 1 || typeof profile[0] !== "string" || !Object.hasOwn(PROFILE_OPTIONS, profile[0]))
    throw new Error("Invalid consumption profile");
  return {
    monthly_kwh: monthlyKwh,
    consumption_profile: PROFILE_OPTIONS[profile[0] as keyof typeof PROFILE_OPTIONS],
  };
}
