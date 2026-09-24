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

export const UPCOMING_SHORT_NAMES = {
  KN: "SKN",
  LC: "St Lucia",
  VC: "SVG",
  GD: "Grenada",
  BB: "Barbados",
  SX: "SXM",
  JM: "Jamaica",
  BM: "Bermuda",
  MS: "Montserrat",
  TC: "TCI",
  VG: "BVI",
  SABA: "Saba",
  BONAIRE: "Bonaire",
  BS: "Bahamas",
  KY: "Cayman",
  CW: "Curaçao",
} satisfies Record<keyof typeof UPCOMING_ISLANDS, string>;

export const WISHLIST_ISLANDS = {
  ...UPCOMING_ISLANDS,
  OTHER: "Other island or territory",
} as const;
