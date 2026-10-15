# Business internal tools archived — 2026-10-10

The expired `/solar-analysis`, `/solution-suggest`, `/quote-settings` and `/pwa` features have been moved into `deprecated/business-internal-tools/`, preserving their original directory structure. This includes their pages, Server Actions, route handlers, password helpers, reports, offline workers/resources, dedicated tests and build scripts. The new route interceptor approach was removed before production promotion.

## Active business behavior

- The four app directories no longer exist, including `/pwa/app`, visit/history APIs and offline-permission handlers. Old URLs fall through to the website's normal missing-route handling.
- TypeScript, ESLint and Vercel source upload exclude `deprecated/`; archived code is not built or deployed. ECharts and PDF.js dependencies and the offline postbuild step were removed. PDF generation utilities still used by existing flyer scripts retain their own dependency.
- Shared generation models, optimizer, price validation/calculation and payback functions remain for customer consultation results and the existing Webhook bundle. The website price database helper now only exports `loadPricing`; management update and history functions were archived.
- Homepage, public calculator, consultation, FAQ, customer token access and public analytics retain their existing behavior. Solar-only analytics and loading behavior were removed from the shared components.
- No database rows, schemas, grants, Edge Functions, mail templates or staff-platform files were changed.
- Already downloaded offline copies cannot be recalled by archiving server code. The website no longer supplies the app or its offline resources.

## Source provenance

Baseline: `dpl_2KUnhACnx2wkUCRakNHjrREdeimG`, `xunneng-solar-jkgnxn9nb-solortide2026.vercel.app`.

The release is assembled in `/tmp/solortide-archive-tools-20261010` from the exact SHA-1 source manifest of the active production deployment. Git HEAD is older than the production site and was not used as the release baseline. The archive contains 111 moved files plus 13 snapshots of mixed-use files. Of these, 86 files were present in the original 948-file production upload and are now removed. Only explicitly listed cleanup/configuration changes are overlaid; unrelated workspace edits are excluded.

## Validation

- Active workspace unit suite: 218 tests plus 6 SEO tests, all 224 passed. Expired feature tests were archived with their source; calculation, customer preview, public navigation and analytics tests remain active.
- `npm run quote:check`: the existing Webhook quote bundle is byte-for-byte unchanged.
- `npm run solar:check`: all 145 model entries and the existing model-table artifact match.
- ESLint: zero errors, five pre-existing warnings.
- Isolated production build/types passed. Route/action manifests contain none of the expired tools; server file traces reference no archive files.
- Upload dry run: 862 actual files, 86 removals from the production baseline, 14 reviewed source/config changes, no added runtime files and no `deprecated/` payload.
- Local production HTTP regression: all removed page/API/worker/resource URLs are unavailable. GET requests return 404. Some ordinary POSTs to unknown top-level country segments get Next.js's streamed missing-page response with HTTP 200; tests explicitly require the not-found marker and no form. No replacement route or interceptor was added for this framework behavior.
- All 12 sitemap pages, canonical/index rules, existing redirects and invalid-country handling passed.
- Both countries' private customer result pages render a valid quote using a read-only local database fixture (300 kWh/night, EC$22,200). Wrong-country tokens remain denied. No production database or email was used by the regression.
- 390px and 1440px browser regressions passed: homepage, country selector, customer calculator, both FAQ and consultation pages; no horizontal overflow or client exception. Tally was stubbed and no form was submitted.

## Production deployment

- Published deployment: `dpl_97H3TFeFZQAL9wEYz45Y7fUmUioo`, `xunneng-solar-o6c26y8e0-solortide2026.vercel.app`.
- Promoted to `https://www.solortide.com` only after candidate checks passed. `vercel inspect www.solortide.com` confirms this deployment is READY.
- Verified the actual remote source manifest: 862 files; no archived directory, expired app routes, retired password helpers or offline resources were uploaded.
- Candidate and canonical-domain HTTP checks passed for all removed pages, child APIs and worker/resource URLs. Public canonical pages, metadata, sitemap, redirects, private-token protection and social image checks passed.
- Production browser checks passed at 390px and 1440px for homepage, country selection, public calculator, FAQ and consultation. No real form or email was sent.
- Staff `/quote-settings` and `/solar-analysis` still return their normal login redirects, confirming the separate staff routes remain available.
- The previous production deployment is retained as the rollback target. No Git push, database write, migration, email-template or Edge Function release was performed.
