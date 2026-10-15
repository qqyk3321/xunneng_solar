import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ConsultationPreview } from "../consultation-preview";
import { modelId, type GenerationModel } from "../solution-suggest/models";
import { parseModelTable } from "../solution-suggest/model-table";
import manifest from "../solution-suggest/model-table-manifest.json";
import { FIXED_INSTALLATION, PROFILES, optimizeSystem } from "../solution-suggest/optimizer";
import { estimateQuoteXcd, parsePricingValues, PRICING_FIELDS } from "./model";
import { estimateReturns } from "./returns";
import { loadPricing } from "./server";

// Only immutable weather data is cached. Prices and customer estimates are not.
let modelPromise: Promise<GenerationModel> | undefined;
function loadModel() {
  return modelPromise ??= readFile(join(process.cwd(), "public", manifest.url.slice(1)), "utf8")
    .then(text => {
      const table = parseModelTable(text, { ...manifest, schemaVersion: 1 });
      const model = table.models.find(item => item.id === modelId(FIXED_INSTALLATION) && item.source === FIXED_INSTALLATION.source);
      if (!model) throw new Error("Missing recommendation model");
      return model;
    }).catch(error => { modelPromise = undefined; throw error; });
}

export type ConsultationEstimate = {
  status: "ready";
  country: "AG" | "DM";
  quoteXcd: number;
  annualSavedKwh: number;
  annualSavedPercent: number;
  annualBeforeXcd: number;
  annualAfterXcd: number;
  annualSavingsXcd: number;
  paybackYears: number | null;
  calculatedAt: string;
} | { status: "missing-inputs" | "unavailable" };

export async function loadCurrentConsultationEstimate(submission: Pick<ConsultationPreview, "country_code" | "monthly_kwh" | "consumption_profile">): Promise<ConsultationEstimate> {
  const { monthly_kwh: monthlyKwh, consumption_profile: profile } = submission;
  if (typeof monthlyKwh !== "number" || !Number.isFinite(monthlyKwh) || monthlyKwh <= 0 || monthlyKwh > 1000000 || !profile || !Object.hasOwn(PROFILES, profile))
    return { status: "missing-inputs" };
  try {
    const country = submission.country_code || "AG";
    if (country !== "AG" && country !== "DM") throw new Error("Unsupported country");
    const [pricing, model] = await Promise.all([loadPricing(), loadModel()]);
    // Same fixed generation model and equipment rules as the emailed quote.
    // Country selects the residential tariff, not a different sizing algorithm.
    const plan = optimizeSystem(model, monthlyKwh, PROFILES[profile].values);
    const prices = parsePricingValues(Object.fromEntries(PRICING_FIELDS.map(field => [field.key, pricing[field.key]])));
    const quoteXcd = estimateQuoteXcd(prices, { ...plan, inverterKw: plan.inverterKw as 5 | 8 | 10 });
    const returns = estimateReturns(plan.months, quoteXcd);
    const local = country === "DM" ? returns.dominica : returns.antigua;
    return {
      status: "ready", country, quoteXcd,
      annualSavedKwh: returns.savedKwh, annualSavedPercent: returns.savedPercent,
      annualBeforeXcd: local.annualBeforeXcd, annualAfterXcd: local.annualAfterXcd,
      annualSavingsXcd: local.annualSavingsXcd, paybackYears: local.years,
      calculatedAt: new Date().toISOString(),
    };
  } catch {
    console.error(JSON.stringify({ event: "consultation_estimate_unavailable" }));
    return { status: "unavailable" };
  }
}
