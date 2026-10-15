# Tally confirmation quote

The `tally-webhook` Edge Function verifies Tally's signature, inserts the submission, and sends the existing Resend confirmation template. The email says the team has prepared a rough quote and links to the current preliminary quote details; it displays neither a price nor a reply deadline.

## Stored input

`tally_form_submissions` adds two nullable columns for legacy compatibility:

| Column | Tally field | Values |
| --- | --- | --- |
| `monthly_kwh` | `question_4NWAkB` — Highest monthly electricity use (kWh) | Positive number, at most 1,000,000 |
| `consumption_profile` | `question_PBYLLb` — Daily electricity-use pattern | `daytime`, `rush`, `evening`, `night` |

Both inputs are required when their field mappings are configured. The four current option UUIDs are mapped explicitly in `energy-input.ts`; labels and historical electrical-supply answers are not accepted as consumption profiles. Old records remain NULL; no historical customer emails are replayed.

If the configured installation-country field is absent, null or blank, intake stores `country_code = 'AG'` (Antigua). Explicit `AG`/`DM` values remain authoritative; unknown nonempty values are rejected. The stored country determines the support mailbox and preview-link region. The original payload remains unchanged.

`question_rrNGK5` is stored as `address.full_address`; legacy split addresses remain supported. The original signed payload is retained as before. Neither equipment plans nor calculated quotes are stored in the database or email audit.

## Calculation and delivery

The optimizer uses its fixed Antigua PVWatts south-facing 20° roof model for both countries, matching the existing recommendation page. It applies the same equipment constraints and fallback selection when demand exceeds the supported equipment capacity.

The price is `ceil((equipment USD × multiplier / 0.37 + compensation XCD) / 100) × 100`. The customer preview displays this as an approximate, rough quote. The configured multiplier is used, not a hard-coded default. Current pricing defaults are in `lib/quote-pricing/model.ts`.

The webhook sends the existing notification and customer detail link only. It neither reads pricing nor computes or passes a quotation amount or reply deadline. Accepted deliveries are still skipped, and provider retries keep the same notification payload and idempotency key. The customer detail page reads current prices independently. Staff plan/version/publication history stays in the staff project; the business database has no pricing audit, publication-history table, or per-submission pricing snapshot.

## Build and deploy

- `quote-engine.js` is a legacy artifact and is no longer imported or deployed by the webhook. Customer calculations use the website’s shared optimizer and pricing code.

- Apply migration `20261008111802_add_tally_energy_inputs.sql` before deploying the function.
- Publish `email/src/push-template.ts` with `RESEND_TEMPLATE_ID` set to the verified production template. It preserves legacy variables while displaying only the preliminary-quote notice and existing preview link, plus submission reference/time and contact details. No quotation amount or response-time promise appears in the email.
- Deploy only `tally-webhook`. Extend `TALLY_INTAKE_CONFIG.fields` with `full_address`, `monthly_kwh`, and `consumption_profile` using the keys above; retain all previous mappings and the existing signing secret.
- Test with Resend's `delivered+label@resend.dev` sink, not customer addresses. Verify the two saved inputs, preliminary-quote link, absence of an emailed price/deadline, accepted audit, and duplicate handling. Remove only the specifically identified synthetic submission afterwards.

Relevant checks: `tests/tally-intake-v2.test.ts`, `tests/tally-quote.test.ts`, `tests/quote-pricing.test.ts`, optimizer/dispatch tests, and `email/src/consultation-email.test.ts`.

## Dynamic customer preview

The existing `/{region}/submission/{token}` email link preserves the original site navigation, submission reference/time, original Tally iframe, footer and floating contact. Only the added estimate section is concise: three numeric cards for project price, annual electricity saved in kWh, and regional payback years, each prefixed with **About**. The estimate section has no bill breakdown, percentages, assumptions or update timestamp. The removed 48-hour reply promise is not restored. Internal equipment costs, multipliers and compensation are never sent to this public view.

Each opening reads `monthly_kwh` and `consumption_profile` from the token-authorized submission and the latest `quote_pricing_settings` record with `cache: no-store`. The page is dynamically rendered; only the immutable weather model is cached in server memory. A browser back/forward-cache restore triggers a refresh. No plan, quote or payback result is written to the database. Changing prices changes the current quote/payback but not the submission or its already-sent email.

The submission's stored country selects the residential reference tariff. Sizing still uses the optimizer's fixed reference model, matching the email and settings page. Missing legacy usage inputs or unavailable pricing/model data show a concise unavailable message and never substitute a free/default quote. Original submitted data remains in the database. Wrong-region and invalid-token links expose no submission or estimate.

The model asset is included in the preview route's server deployment through `outputFileTracingIncludes`. Publish the website to make this page enhancement live; neither the Resend link nor the Webhook needs to change. Relevant checks: `tests/consultation-estimate.test.ts`, `tests/consultation-preview-access.test.ts`, and `tests/preview-estimate.browser.cjs` (synthetic AG, DM, and legacy fixtures supplied by `PREVIEW_ESTIMATE_FIXTURE`).

## Verification on 2026-10-08

Database migration, production Edge Function and hosted Resend template were deployed. Signed synthetic AG (300 kWh, night) and DM (2,000 kWh, daytime) requests returned 200 in approximately 6.0 and 4.8 seconds. With the configured 3.7 multiplier, rendered test emails contained EC$20,500 and EC$60,500 respectively and Resend reported delivered. Both duplicate requests returned 200 without an additional send attempt. Synthetic database submissions and their dependent audit/token rows were removed afterwards. Existing customer submissions were not replayed. Database security advisors reported no warnings.
