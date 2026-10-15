# Solortide brand SEO release — 2026-10-10

## Release scope and source provenance

This release strengthens the association between the public-facing name **Solortide**, the company name **Sol & Tide Energy**, and `https://www.solortide.com`. It does not claim that Google rankings, indexing or Search Console validation have already changed.

- Previous production: `dpl_6YoLWmCr3ozE29PpWPykF2A3r9Wt`, `xunneng-solar-rbp5lejuf-solortide2026.vercel.app`.
- Released production: `dpl_2KUnhACnx2wkUCRakNHjrREdeimG`, `xunneng-solar-jkgnxn9nb-solortide2026.vercel.app`.
- The previous Vercel source manifest contains 948 actual files. All 948 matched the local workspace by SHA-1 before the SEO edits.
- An isolated release directory was assembled from that exact manifest, not from Git HEAD. This is important: Git `main` at `f40d2a3` does not yet contain existing deployed quotation/customer-result updates. Deploying that branch with only the SEO patch could roll those updates back.
- Release payload: the same 948 actual files, no added or removed production-source files, exactly the 10 changes listed below. Test/documentation directories are excluded from the uploaded payload. Environment files, private keys, the separate email workspace, design sources and exports are excluded by `.vercelignore`.
- Direct Vercel production candidate was created with `--skip-domain`, to allow testing before promotion. No Git main push, database migration, Edge Function update or email-template change is part of this release.

## Changes

1. `app/page.tsx`: homepage title begins with Solortide; description names both brands; homepage outputs connected WebSite and Organization JSON-LD.
2. `components/caribbean-homepage.tsx`: visible English hero copy names `Solortide by Sol & Tide Energy`. Existing logo, headline, navigation and layout remain.
3. `lib/region-seo.ts`: WebSite name Solortide, alternateName Sol & Tide Energy; Organization keeps company name and adds Solortide alias, service countries and existing country-specific contacts. Publisher links the two entities. Regional metadata and Open Graph site name consistently use Solortide.
4. `app/layout.tsx`: brand-aligned fallback title and description; existing production/preview robots logic is unchanged.
5. `app/consultation/page.tsx`: selector page title uses Solortide.
6. `app/how-it-works/page.tsx`: title uses Solortide; adds reciprocal regional language alternates.
7. `app/[region]/how-it-works/page.tsx`: same regional metadata improvements.
8. `app/sitemap.ts`: same 12 indexable canonical pages; reciprocal alternates for how-it-works and country FAQ groups.
9. `app/[region]/layout.tsx`: `dynamicParams = false` limits only the country segment to antigua/dominica. Invalid country paths now return actual HTTP 404. Dynamic customer-token children remain supported and were tested with tokens created after the build.
10. `app/opengraph-image.tsx`: generated share image and its alternative text identify both Solortide and Sol & Tide Energy.

No fabricated social URL, phone, physical address, review, accreditation or installation claim was introduced. Facebook `sameAs` remains pending a verified official public Page URL from the user.

## Deliberately preserved indexing rules

- Homepage, regional homepages, consultation selectors/entries, how-it-works pages, both country FAQ pages, and generic privacy are indexable canonical pages.
- `/antigua/faq` and `/dominica/faq` remain self-canonical and in the sitemap. `/faq` remains a noindex country selector and is not an alternate target.
- `/antigua/privacy` and `/dominica/privacy` remain usable in their country context with canonical `/privacy`; these duplicates are not treated as an error or redirected.
- Private `/[region]/submission/[token]` results remain `noindex, nofollow`, outside the sitemap. Invalid-token streaming responses may still use HTTP 200 with noindex; that separate behavior has **not** been represented as fixed.
- Archived preview/test routes remain blocked with HTTP 404 and noindex.
- Existing HTTPS/www and trailing-slash redirects are preserved. A redirecting alias is not itself an indexable target; a GSC redirect exclusion can be expected.

## Validation

- Targeted `tests/seo.test.ts`: 6 passed.
- Full unit runner: 282 passed, 1 existing route-catalog failure because `/quote-settings` is not listed in the catalog. This file and the catalog were not altered by this release. The runner stops before SEO tests on this failure, so SEO tests were also run separately. Do not describe the entire suite as green.
- ESLint: 0 errors, 5 existing warnings.
- Isolated production build, type checks, static generation and postbuild: passed.
- A first local build encountered Vercel's `[SENSITIVE]` placeholder for SITE_URL from environment export; it was rerun successfully with the known public canonical SITE_URL. No production environment setting was changed. Sensitive database values were not exported or used for local private-result fixtures.
- `tests/seo-release.smoke.mjs`: 12 indexable sitemap pages; canonical/alternate/robots/brand assertions; invalid-region HTTP 404 for ordinary requests and Googlebot; preserved redirects/test protection; both countries' dynamically generated result tokens with a local read-only fixture; wrong-country access denied. No production database accessed by this test.
- `tests/seo-brand.browser.cjs`: 390px and 1440px, visible brand, no horizontal overflow/client exception, country selector, regional calculator, both countries' FAQ and consultation entries. Tally is stubbed and no forms are submitted. This focused test replaces using an old broad homepage browser test whose mobile accessible-name selector is stale; the old file was not changed.
- `tests/seo-public.smoke.mjs`: read-only candidate/production verification. Candidate `*.vercel.app` URLs carry Vercel's own noindex header; the canonical production domain must be checked separately for the absence of that header.

## Search Console follow-up (not performed automatically)

1. Inspect `https://www.solortide.com/`, run a live URL test, then request indexing once after deployment.
2. Inspect the two country homepages and two country FAQ URLs as needed. Confirm Google's selected canonical matches the intended canonical after recrawling.
3. Confirm the existing submitted `https://www.solortide.com/sitemap.xml` is fetched successfully; the URL has not changed.
4. Only validate an issue as fixed when its exact affected URLs were checked. Do not try to force expected redirects, private noindex pages or privacy canonical duplicates into the index.
5. Track the `solortide` query under Performance after new crawling/impressions. No ranking deadline or inclusion guarantee is implied. The authenticated GSC report and the exact two URLs from the old redirect validation are not available in this release workflow.

Google reference: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl

## Production promotion

- Promoted successfully with `vercel promote xunneng-solar-jkgnxn9nb-solortide2026.vercel.app --scope solortide2026 --yes` after the candidate checks passed.
- `vercel inspect www.solortide.com` resolves to `dpl_2KUnhACnx2wkUCRakNHjrREdeimG`, production, Ready.
- `tests/seo-public.smoke.mjs` passed both against the authenticated candidate and against the public `https://www.solortide.com` after promotion. All 12 canonical sitemap pages return 200 with index/follow and **no** noindex HTTP header on the official domain. The new homepage title, visible brand, JSON-LD, country FAQs, sitemap alternates and generated share image are live.
- The responsive browser regression was rerun against the actual `https://www.solortide.com` after promotion: both 390px and 1440px passed. Brand visibility, country selection, calculator, FAQ and consultation entries work without horizontal overflow or client exceptions. Tally remained stubbed and no real consultation/contact submission was made.
- The canonical domain returns 404 for tested invalid public country routes and for the retired preview-test route; private invalid-token routes remain noindex and show no customer result.
- Redirect chains were verified live: HTTP bare host → HTTPS bare host → HTTPS www; HTTPS bare host → HTTPS www; HTTP www → HTTPS www. Each hop is 308, ending in 200. A country FAQ URL with a test query retains both its path and query during the bare-host redirect.
- Existing production deployment was retained as a rollback target; no deletion was performed. If rollback becomes necessary, use the prior deployment ID, not the stale Git main source tree.
- No Search Console indexing request or validation was submitted, and no actual Google search-result improvement is asserted.
- The temporary production environment export used for the local build was deleted after verification. The user's project `.env` and Vercel environment settings were not changed.
