import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export const SOLAR_ACCESS_COOKIE = "solar_analysis_access";

const configuredPassword = () =>
  process.env.SOLAR_ANALYSIS_PASSWORD || "solortide2026";

const privatePassword = () => process.env.SOLAR_PRIVATE_PASSWORD || "qqyk3321";
export type SolarAccessMode = "audited" | "private";

const digest = (value: string) =>
  createHash("sha256").update(`sol-tide-solar-analysis:v1:${value}`).digest("hex");

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export function passwordIsValid(candidate: string) {
  return passwordAccessMode(candidate) !== null;
}

export function passwordAccessMode(candidate: string): SolarAccessMode | null {
  if (safeEqual(digest(candidate), digest(privatePassword()))) return "private";
  if (safeEqual(digest(candidate), digest(configuredPassword()))) return "audited";
  return null;
}

export function accessCookieMode(candidate?: string): SolarAccessMode | null {
  if (!candidate) return null;
  if (safeEqual(candidate, accessCookieValue("private"))) return "private";
  if (safeEqual(candidate, accessCookieValue("audited"))) return "audited";
  return null;
}

export function accessCookieIsValid(candidate?: string) {
  return accessCookieMode(candidate) !== null;
}

export function accessCookieValue(mode: SolarAccessMode = "audited") {
  // Preserve existing public-password sessions, but domain-separate private access.
  return mode === "private" ? digest(`private:${privatePassword()}`) : digest(configuredPassword());
}

export const PWA_ACCESS_COOKIE = "solar_pwa_download_access";
export const pwaPasswordIsValid = (candidate: string) => safeEqual(digest(candidate), digest(privatePassword()));
export const pwaCookieValue = () => digest(`pwa-download:${privatePassword()}`);
export const pwaCookieIsValid = (candidate?: string) => Boolean(candidate && safeEqual(candidate, pwaCookieValue()));
