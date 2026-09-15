import type { ServiceCountry } from "./consultation-intake";

export function buildTallyIntakeUrl(formId: string, country: ServiceCountry) {
  if (!/^[A-Za-z0-9]+$/.test(formId)) throw new Error("Invalid Tally form ID");
  const url = new URL(`https://tally.so/embed/${formId}`);
  for (const key of [
    "alignLeft",
    "hideTitle",
    "transparentBackground",
    "dynamicHeight",
  ])
    url.searchParams.set(key, "1");
  url.searchParams.set("installation_country", country);
  url.searchParams.set(
    "installation_country_display",
    country === "AG" ? "Antigua and Barbuda" : "Dominica",
  );
  return url.toString();
}

export function isTallySubmissionMessage(
  origin: string,
  data: unknown,
  formId: string,
) {
  if (origin !== "https://tally.so" || typeof data !== "string") return false;
  try {
    const message = JSON.parse(data);
    return (
      message?.event === "Tally.FormSubmitted" &&
      message?.payload?.formId === formId
    );
  } catch {
    return false;
  }
}
