import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export const SOLAR_ACCESS_COOKIE = "solar_analysis_access";

const configuredPassword = () =>
  process.env.SOLAR_ANALYSIS_PASSWORD || "solortide2026";

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
  return safeEqual(digest(candidate), digest(configuredPassword()));
}

export function accessCookieIsValid(candidate?: string) {
  return Boolean(candidate && safeEqual(candidate, digest(configuredPassword())));
}

export function accessCookieValue() {
  return digest(configuredPassword());
}
