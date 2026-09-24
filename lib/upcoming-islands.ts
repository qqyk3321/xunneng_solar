/** Planned locations only; never use this list as selectable installation countries. */
export const UPCOMING_ISLANDS = {
  KN: "St Kitts and Nevis",
  LC: "St Lucia",
  VC: "St Vincent and the Grenadines",
  GD: "Grenada",
  BB: "Barbados",
  SX: "Sint Maarten",
  JM: "Jamaica",
} as const;

export const WISHLIST_ISLANDS = {
  ...UPCOMING_ISLANDS,
  OTHER: "Other Caribbean island or territory",
} as const;
