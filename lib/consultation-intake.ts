export const PRIVACY_VERSION = "2026-09-13-draft";

export const SERVICE_COUNTRIES = {
  AG: { label: "Antigua", center: { lat: 17.0747, lng: -61.8175 } },
  DM: { label: "Dominica", center: { lat: 15.415, lng: -61.371 } },
} as const;
export type ServiceCountry = keyof typeof SERVICE_COUNTRIES;
export type IntakeAcknowledgement = {
  country: ServiceCountry;
  privacyVersion: string;
  acknowledgedAt: string;
};

export function acknowledgeIntake(
  country: string,
  accepted: boolean,
): IntakeAcknowledgement | null {
  if (!accepted || (country !== "AG" && country !== "DM")) return null;
  return {
    country,
    privacyVersion: PRIVACY_VERSION,
    acknowledgedAt: new Date().toISOString(),
  };
}
