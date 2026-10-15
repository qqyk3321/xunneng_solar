export const WISHLIST_REGIONS: Record<string, { name: string; flag: string; zone: string }> = {
  KN: { name: "St Kitts and Nevis", flag: "kn", zone: "America/St_Kitts" },
  LC: { name: "St Lucia", flag: "lc", zone: "America/St_Lucia" },
  VC: { name: "St Vincent and the Grenadines", flag: "vc", zone: "America/St_Vincent" },
  GD: { name: "Grenada", flag: "gd", zone: "America/Grenada" },
  BB: { name: "Barbados", flag: "bb", zone: "America/Barbados" },
  SX: { name: "Sint Maarten", flag: "sx", zone: "America/Lower_Princes" },
  JM: { name: "Jamaica", flag: "jm", zone: "America/Jamaica" },
  BM: { name: "Bermuda", flag: "bm", zone: "Atlantic/Bermuda" },
  MS: { name: "Montserrat", flag: "ms", zone: "America/Montserrat" },
  TC: { name: "Turks & Caicos", flag: "tc", zone: "America/Grand_Turk" },
  VG: { name: "British Virgin Islands", flag: "vg", zone: "America/Tortola" },
  SABA: { name: "Saba", flag: "saba", zone: "America/Kralendijk" },
  BONAIRE: { name: "Bonaire", flag: "bonaire", zone: "America/Kralendijk" },
  BS: { name: "Bahamas", flag: "bs", zone: "America/Nassau" },
  KY: { name: "Cayman Islands", flag: "ky", zone: "America/Cayman" },
  CW: { name: "Curaçao", flag: "cw", zone: "America/Curacao" },
};
export function wishlistRegion(code: string, other: string) {
  if (Object.hasOwn(WISHLIST_REGIONS, code)) return WISHLIST_REGIONS[code];
  if (code === "OTHER" && other.trim()) return { name: other.trim(), flag: "other", zone: "UTC" };
  throw Error("invalid_wishlist_region");
}
export function wishlistTime(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset" }).format(new Date(value));
}
export function emailText(value: string) {
  return value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
