import assert from "node:assert/strict";
import test from "node:test";
import { loadCurrentConsultationEstimate } from "../lib/quote-pricing/consultation-estimate";
import { DEFAULT_PRICING } from "../lib/quote-pricing/model";

test("preview rereads prices, selects the submitted country's tariff, and never stores results", async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL, previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://preview-estimate.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-only";
  let pricing = { ...DEFAULT_PRICING }, calls = 0, unavailable = false;
  globalThis.fetch = async (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/quote_pricing_settings");
    assert.equal(init?.method, "GET", "customer estimates must only read the database");
    assert.equal(init?.cache, "no-store");
    return Response.json(unavailable ? { message: "unavailable" } : { ...pricing, id: 1, version: calls, updated_at: new Date().toISOString() }, { status: unavailable ? 403 : 200 });
  };
  try {
    const input = { country_code: "AG" as const, monthly_kwh: 300, consumption_profile: "night" as const };
    const ag = await loadCurrentConsultationEstimate(input);
    const dm = await loadCurrentConsultationEstimate({ ...input, country_code: "DM" });
    assert.equal(ag.status, "ready"); assert.equal(dm.status, "ready");
    if (ag.status !== "ready" || dm.status !== "ready") assert.fail("ready estimates expected");
    assert.equal(ag.quoteXcd, 22200);
    assert.equal(dm.quoteXcd, ag.quoteXcd);
    assert.equal(dm.annualSavedKwh, ag.annualSavedKwh);
    assert.equal(ag.country, "AG"); assert.equal(dm.country, "DM");
    assert.notEqual(ag.annualSavingsXcd, dm.annualSavingsXcd);
    assert.ok(Math.abs(ag.annualSavedKwh / 3600 * 100 - ag.annualSavedPercent) < 1e-9);
    assert.equal(ag.paybackYears, ag.quoteXcd / ag.annualSavingsXcd);
    assert.equal(dm.paybackYears, dm.quoteXcd / dm.annualSavingsXcd);
    assert.ok(Math.abs(ag.annualBeforeXcd - ag.annualAfterXcd - ag.annualSavingsXcd) < 1e-9);

    pricing = { ...pricing, price_multiplier: 3.7 };
    const revised = await loadCurrentConsultationEstimate(input);
    if (revised.status !== "ready") assert.fail("revised estimate expected");
    assert.equal(revised.quoteXcd, 20500);
    assert.equal(revised.annualSavedKwh, ag.annualSavedKwh);
    assert.ok(revised.paybackYears! < ag.paybackYears!);
    assert.equal(calls, 3, "every view reads the current pricing record");
    assert.ok(!("inverter_5kw_usd" in revised), "internal costs are not returned to the public view");

    for (const invalid of [{ monthly_kwh: null }, { monthly_kwh: 0 }, { consumption_profile: null }])
      assert.deepEqual(await loadCurrentConsultationEstimate({ ...input, ...invalid }), { status: "missing-inputs" });
    assert.equal(calls, 3, "old records must not invent usage inputs");
    unavailable = true;
    assert.deepEqual(await loadCurrentConsultationEstimate(input), { status: "unavailable" });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
