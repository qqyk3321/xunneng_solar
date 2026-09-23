export const PREFERENCES_KEY = "sol-tide:cookie-preferences:v1";
export const LEGACY_DISMISSED_KEY = "sol-tide:cookie-ui:dismissed:v2";
export const PREFERENCE_COOKIE = "sol_tide_preferences";
export type Preferences = { analytics: boolean; marketing: boolean };

export function parsePreferences(raw: string | null): Preferences | null {
  try {
    const value = JSON.parse(raw ?? "null");
    return value?.version === 1 &&
      typeof value.analytics === "boolean" &&
      typeof value.marketing === "boolean"
      ? { analytics: value.analytics, marketing: value.marketing }
      : null;
  } catch {
    return null;
  }
}

/** Essential preference only. No identifier, tracking, or service consent wiring. */
export function savePreferences(value: Preferences) {
  const raw = JSON.stringify({ version: 1, ...value });
  // Each store is independent: one blocked API must not prevent the others.
  try {
    localStorage.setItem(PREFERENCES_KEY, raw);
  } catch {
    /* optional */
  }
  try {
    sessionStorage.setItem(LEGACY_DISMISSED_KEY, "1");
  } catch {
    /* optional */
  }
  try {
    const domain = /^(www\.)?solortide\.com$/.test(location.hostname)
      ? "; Domain=solortide.com"
      : "";
    document.cookie = `${PREFERENCE_COOKIE}=${encodeURIComponent(raw)}; Path=/; Max-Age=34560000; SameSite=Lax${domain}${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* Browsers can block all persistent storage. */
  }
}

export function readPreferences(): Preferences | null {
  let saved: Preferences | null = null;
  try {
    saved = parsePreferences(localStorage.getItem(PREFERENCES_KEY));
  } catch {
    /* optional */
  }
  if (!saved) {
    try {
      const raw = document.cookie
        .split("; ")
        .find((item) => item.startsWith(PREFERENCE_COOKIE + "="))
        ?.slice(PREFERENCE_COOKIE.length + 1);
      saved = raw ? parsePreferences(decodeURIComponent(raw)) : null;
    } catch {
      /* optional */
    }
  }
  if (!saved) {
    try {
      if (localStorage.getItem(LEGACY_DISMISSED_KEY) === "1")
        saved = { analytics: false, marketing: false };
    } catch {
      /* optional */
    }
  }
  // Migrate old saved choices and renew the cookie fallback. localStorage has no expiry.
  if (saved) savePreferences(saved);
  return saved;
}
