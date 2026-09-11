# Antigua home solar + battery calculator

Local test URL: `http://192.168.1.176:3003/antigua-calculator-preview`.
Also listed under **Solar calculators** at `/test-pages`.

Independent, development-only, noindex page. No login, database, storage, submissions or external calculation APIs. The same calculator module is now embedded in `/` as part of the separately approved [homepage redesign](./homepage-redesign.md); its calculation rules and independent test page remain available. `/consultation` and middleware are unchanged. Do not start another server or publish this experiment just to test it.

## Structure

- `app/antigua-calculator-preview/page.tsx`: development guard, page metadata and standalone preview header/title.
- `components/antigua-solar-calculator.tsx` and its CSS module: reusable client calculator, English interface following `demo/DESIGN.md` (teal, amber, white cards, Space Grotesk / Plus Jakarta Sans). No global style changes.
- `lib/antigua-calculator/config.ts`: all provisional tariff, range, package, savings and backup assumptions.
- `lib/antigua-calculator/calculate.ts`: pure full-precision calculations; no UI or services.

## Model and provenance

Implements the attached **安提瓜户用光储计算器_开发交接说明.md**.
The AGM hybrid calculator is an interaction reference only; its branding, prices, currency, panel rules and backup promises are not copied.

The bill tooltip identifies the **APUA June 2026 preset and EC$0.80/kWh fuel surcharge**. [APUA's rate reference](https://www.apua.ag/customer-service/rates/) lists EC$0.40/kWh for the first 300 kWh, EC$0.38/kWh above that, and EC$0.80/kWh fuel adjustment for June 2026. This is a dated preset, not a live tariff or a claim to have verified a later month's bill. The fuel charge varies independently of the base tariff. APUA's EC$25 minimum is documented here but not modeled; the calculator supports only 300–2,000 kWh/month.

Bill = first-tier base charge + additional-tier base charge + fuel adjustment × all kWh. With the supplied preset, supported bills are EC$360–2,366; bounds are derived from config rather than hard-coded. The UI accepts only the monthly bill through a slider in EC$1 steps, with no editable numeric field or consumption-mode switch. The calculation engine still uses full precision for internal tariff inversion, package selection and prices, and supports decimal values in its regression tests. Battery capacity retains its kWh unit in the system preview; it is not a consumption input.

Savings = original bill × 80%; annual savings = monthly savings × 12; remaining bill = original bill − savings. The remaining amount is not a full rebilling at reduced kWh. Rounded savings and remaining bill sum to the rounded original bill.

Package selection uses unrounded kWh, inclusive upper boundaries and only a 1e-8 kWh floating-point tolerance. No quote or package is shown for invalid or unsupported values. Price = annual savings × linearly interpolated target payback years (4.0 down to 2.7). This is **a valuation rule, not an independent return calculation or supplier quote**. There is no cost table, exchange rate, solar array size or panel count.

Backup = battery kWh × 90% usable fraction × 90% AC efficiency ÷ 1 kW load: 4.05 hours for 5 kWh (displayed as 4.1) and 8.1 hours for 10 kWh. Assumes full battery, 10% reserve, no solar during outage. Does not guarantee whole-home backup or motor-start capability.

## Simplified preview layout

`<AntiguaSolarCalculator />` renders a reusable outer card without page headers, a `main` wrapper or a full-height background. Its left panel has no separate card border; its right panel retains a lightly shaded result card with tighter row spacing. Form and heading IDs are scoped per instance. The left panel ends with **Get Your Free Assessment**, a navigation-only CTA to `/consultation` everywhere, with prefetch disabled. It uses the design palette's orange `#fea619` with dark text; the previous configurable contact anchor is removed. No form submission or data transfer is performed by this link.

The input card shows the selected slider amount and a separate system preview such as **6.0 kW + 10 kWh** (inverter + battery), not a second converted bill/consumption result. A question-mark button next to the bill label explains the June 2026 EC$0.80/kWh fuel surcharge on hover, keyboard focus or touch; Escape dismisses it. The underlying calculation rules are unchanged.

The result card is titled **Estimate Your Savings** and presents six separate rows: monthly savings, annual savings, simple payback, monthly bill after installation, suggested investment and outage backup. Monthly savings and payback have the largest, bold teal numbers. Payback is always the third row, approximated to one decimal (e.g. **~3.5 years**), without rounding the price calculation; suggested investment also has an approximate prefix (e.g. **~EC$ 40,386**). Individual metric labels no longer repeat “Estimated”. Device model codes, step numbers, decorative icons, formula explanations, expandable calculation details and the planning footer are absent. Model documentation stays in this file, not the customer UI.

## Verification

```bash
node --import tsx --test tests/antigua-calculator.test.ts tests/test-pages.test.ts
npx tsc --noEmit
npx eslint app/antigua-calculator-preview components/antigua-solar-calculator.tsx lib/antigua-calculator lib/test-pages/catalog.ts tests/antigua-calculator.test.ts
PLAYWRIGHT_MODULE=/path/to/playwright node tests/antigua-calculator.browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/test-pages.browser.cjs
```

The unit suite checks all seven acceptance examples through the engine's bill/consumption calculations, package boundaries ±0.01 kWh, tariff inversion, cent-level inputs, invalid values, price continuity, a 0.01 kWh sweep for increasing price and non-increasing payback, rounding identities, changed fuel assumptions and backup consistency. Browser checks use the existing local server, verify bill-only slider input with pointer and keyboard controls, absence of a consumption switch, left-side system preview, third-row one-decimal payback, removal of calculation explanations, and mouse/keyboard/touch tooltips. They check 320/375/768/960/1280px layouts and reject backend requests. No cloud data is read or written.
