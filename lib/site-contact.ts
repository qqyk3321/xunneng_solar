import { DEFAULT_WHATSAPP_BASE_URL } from "../supabase/functions/_shared/whatsapp";
import type { ServiceCountry } from "./consultation-intake";

export const SUPPORT_EMAILS = {
  AG: "ag-support@solortide.com",
  DM: "dm-support@solortide.com",
} as const;

export function supportEmail(country: ServiceCountry | null) {
  return country ? SUPPORT_EMAILS[country] : null;
}

const FACEBOOK_PAGE_ID = "1435499099637488";

/** Keep mock values for design work; never publish them as real contacts. */
export const SITE_CONTACT = {
  facebookUrl: `https://www.facebook.com/${FACEBOOK_PAGE_ID}`,
  messengerUrl: `https://m.me/${FACEBOOK_PAGE_ID}`,
  // Add the confirmed business-profile URL to enable every Instagram entry.
  instagramUrl: "",
  whatsappUrl: DEFAULT_WHATSAPP_BASE_URL,
  whatsappNumber: "+86 176 0588 6812",
  showMockContacts: false,
  phone: "+1 (268) 555-0100",
  phoneHref: "tel:+12685550100",
  address: "123 Example Street, St. John's, Antigua",
} as const;
