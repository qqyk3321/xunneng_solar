import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export const LOCAL_AREA_CODES: Partial<Record<CountryCode, string>> = { AG: "268", DM: "767" };

export function phonePrefix(country: CountryCode) {
  const area = LOCAL_AREA_CODES[country];
  return `+${getCountryCallingCode(country)}${area ? ` (${area})` : ""}`;
}

/** Stored values remain E.164; only the editable part excludes the fixed prefix. */
export function phoneLocalDigits(value: string, country: CountryCode) {
  const prefix = `+${getCountryCallingCode(country)}${LOCAL_AREA_CODES[country] || ""}`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

export function regionalPhoneValue(input: string, country: CountryCode) {
  const area = LOCAL_AREA_CODES[country];
  if (!area) throw Error("A regional phone prefix is required");
  let digits = input.replace(/\D/g, "");
  if (!digits) return "";
  // Only strip complete dialling prefixes: a seven-digit local number can itself
  // start with 268 or 767. Never truncate overlong numbers into valid ones.
  if (input.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith(`001${area}`) && digits.length === 13) digits = digits.slice(6);
  else if (digits.startsWith(`1${area}`) && digits.length === 11) digits = digits.slice(4);
  else if (digits.startsWith(area) && digits.length === 10) digits = digits.slice(3);
  return `+1${area}${digits}`;
}

export function switchPhoneCountry(value: string, previous: CountryCode, next: CountryCode) {
  if (!value) return "";
  const digits = LOCAL_AREA_CODES[previous]
    ? phoneLocalDigits(value, previous).replace(/\D/g, "")
    : (parsePhoneNumberFromString(value)?.nationalNumber || phoneLocalDigits(value, previous).replace(/\D/g, ""));
  return digits ? `+${getCountryCallingCode(next)}${LOCAL_AREA_CODES[next] || ""}${digits}` : "";
}
