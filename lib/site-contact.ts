import type { ServiceCountry } from "./consultation-intake";

export const SUPPORT_EMAILS = {
  AG: "ag-support@solortide.com",
  DM: "dm-support@solortide.com",
} as const;

export function supportEmail(country: ServiceCountry | null) {
  return country ? SUPPORT_EMAILS[country] : null;
}

/** Keep mock values for design work; never publish them as real contacts. */
export const SITE_CONTACT = {
  showMockContacts: false,
  phone: "+1 (268) 555-0100",
  phoneHref: "tel:+12685550100",
  address: "123 Example Street, St. John's, Antigua",
} as const;
