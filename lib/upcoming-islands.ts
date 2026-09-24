/** Planned locations only; never use this list as selectable installation countries. */
export const UPCOMING_ISLANDS = {
  KN: "St Kitts and Nevis",
  LC: "St Lucia",
  VC: "St Vincent and the Grenadines",
  GD: "Grenada",
  BB: "Barbados",
  SX: "Sint Maarten",
  JM: "Jamaica",
  BM: "Bermuda",
  MS: "Montserrat",
  TC: "Turks & Caicos",
  VG: "British Virgin Islands",
  SABA: "Saba",
  BONAIRE: "Bonaire",
  BS: "Bahamas",
  KY: "Cayman Islands",
  CW: "Curaçao",
} as const;

// Keep the selector compact; the wishlist retains every planned location.
export const UPCOMING_PREVIEW_COUNT = 4;

export const WISHLIST_ISLANDS = {
  ...UPCOMING_ISLANDS,
  OTHER: "Other island or territory",
} as const;
