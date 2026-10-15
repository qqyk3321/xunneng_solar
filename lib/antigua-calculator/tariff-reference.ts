import { ANTIGUA_CONFIG, DOMINICA_CONFIG } from "./config";

/** Source dates describe the inputs, not a live utility feed. Reviewed 8 Oct 2026. */
export function tariffReference(country: "AG" | "DM") {
  const t = (country === "AG" ? ANTIGUA_CONFIG : DOMINICA_CONFIG).tariff;
  const base = `Residential electricity, in EC$: ${t.firstTierRate.toFixed(2)}/kWh for the first ${t.firstTierLimit} kWh each month; ${t.additionalRate.toFixed(2)}/kWh thereafter.`;
  return country === "AG" ? {
    title: `APUA · ${t.sourceDate}`,
    description: `${base} Fuel surcharge: EC$${t.fuelAdjustment.toFixed(2)}/kWh, effective October 2026. Minimum monthly bill: EC$${t.minimumCharge.toFixed(2)}.`,
    caveat: "Latest published fuel rate found as of 8 Oct 2026. Held constant for this estimate; not a live rate or a forecast of future tariffs.",
    sources: [
      { label: "APUA · residential base rates", href: "https://www.apua.ag/customer-service/rates/" },
      { label: "October fuel rate · Antigua Observer report", href: "https://antiguaobserver.com/apua-fuel-rate-increase-pushes-october-electricity-bills-higher/" },
    ],
  } : {
    title: `DOMLEC · ${t.sourceDate}`,
    description: `${base} Fuel surcharge: EC$${t.fuelAdjustment.toFixed(4)}/kWh (September 2026, latest found). VAT: 15% on base electricity charges above ${t.vatFreeKwh} kWh; no VAT on fuel surcharge. Minimum monthly bill: EC$${t.minimumCharge.toFixed(2)}.`,
    caveat: "Reviewed 8 Oct 2026. Existing base rates and the latest fuel rate found are held constant for this estimate. DOMLEC announced a new tariff for 1 Nov 2026; its full residential rate table has not yet been verified and is not included. Not a live rate or a forecast.",
    sources: [
      { label: "WTO · existing base rates (2023, note 150)", href: "https://sice.oas.org/ctyindex/OECS/WTO/TPR_2023/s437-02_e.pdf" },
      { label: "DOMLEC September fuel announcement · Q95", href: "https://www.q95da.com/news/domlec-pro-ayeola-george-said-the-fuel-surcharge-increased-in-september-due-to-the-rate-not-being-fixed-the-geothermal-commercial-rate" },
      { label: "Government · VAT changes from August 2022", href: "https://www.news.gov.dm/news/news-items/budget-address-2022-2023-presented-by-prime-minister-hon-roosevelt-skerrit" },
      { label: "DOMLEC · 7 October tariff announcement", href: "https://natureisle.news/electricity/domlec-announces-approval-of-new-electricity-tariff/" },
    ],
  };
}
