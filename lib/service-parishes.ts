// Sources checked 2026-09-13:
// https://gis.gov.ag/?page_id=130
// https://stats.gov.dm/subjects/demographic-statistics/population-by-sex-and-parish-2001-and-2011/
export const SERVICE_PARISHES: Record<string, readonly string[]> = {
  AG: [
    "Saint George",
    "Saint John",
    "Saint Mary",
    "Saint Paul",
    "Saint Peter",
    "Saint Philip",
  ],
  DM: [
    "Saint Andrew",
    "Saint David",
    "Saint George",
    "Saint John",
    "Saint Joseph",
    "Saint Luke",
    "Saint Mark",
    "Saint Patrick",
    "Saint Paul",
    "Saint Peter",
  ],
};
export function normalizeParish(value: string, countryCode: string): string {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/^st\.?\s+/, "saint ")
      .replace(/\s+parish$/, "")
      .trim();
  return (
    (SERVICE_PARISHES[countryCode] ?? []).find(
      (parish) => normalize(parish) === normalize(value),
    ) ?? ""
  );
}
