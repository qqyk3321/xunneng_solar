# Production release and local experiment archive

## Public features

- `/`: homepage, savings calculator, anonymous Contact us (plain text / rich text / compressed images).
- `/faq`: searchable FAQ and the same anonymous question form.
- `/consultation`: existing Tally consultation flow.
- `/submission-preview-test?id=...`: existing customer result links. Despite the historical name, this is a production route; its three-ID validation is unchanged.
- `POST /api/contact`: write-only inquiry endpoint. Saves to the existing `anonymous_inquiries_preview` table and private `anonymous-inquiry-images-preview` bucket; historical names retained to avoid moving or losing data.

Contact us and FAQ do not create tickets or send automated email. Staff follow up manually. The 48-hour receipt appears only after confirmed persistence.

## Archived experiments

Open `/test-pages` under `npm run dev`. Accounts, account homepage, personal submissions, standalone calculators, image/rich-text labs, message list/detail/modal/download and legacy submission APIs remain local-only. Their existing URLs are preserved for bookmarks. The middleware blocks all registered experiment roots AND children in production, including Vercel Preview deployments. Do not expose the development server publicly; its message list can contain real customer data.

Public navigation does not link to this archive. Register future experiments in `lib/test-pages/catalog.ts` and `lib/test-pages/access.ts`; mirror the root in the literal middleware matcher. Regression tests enforce classification and coverage.

## Vercel configuration

- Framework: Next.js; root: repository root; install: `npm ci`; build: `npm run build`; default output; Node: 24.x.
- Set `NEXT_PUBLIC_TALLY_FORM_ID`, `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`, `GOOGLE_MAPS_SERVER_KEY` for the consultation flow.
- Set server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for inquiry storage and existing result previews.
- Set server-only `SITE_URL=https://your-canonical-domain` for the site's canonical origin. Redirect other custom aliases to this domain. Vercel's `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are additionally accepted only when running on Vercel. Do not change `NODE_ENV`.
- Set server-only `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for production inquiry protection. Missing/unavailable protection returns a retryable 503, never a false success. Existing local auth limiter remains separate.
- Apply appropriate Production / Preview environment scopes, then redeploy. Auth variables are not required for the public pages.
- Google browser keys need the new domain allowed. Supabase Edge Function `CONSULTATION_PREVIEW_BASE_URL` must point to the customer-facing website. Existing webhook/email infrastructure is separate from this Next.js deployment.

## Inquiry safeguards

### Diagnosing a 503

Failed server dependencies emit a structured `contact_submission_failed` log. Search Vercel Runtime Logs for this event. `stage` identifies `upstash.config`, `upstash.limit`, `supabase.config`, `supabase.lookup`, `supabase.upload`, `supabase.insert` or the fallback `supabase.request`. `reason` classifies missing configuration, credentials/permissions, timeout, network, or a generic dependency error. `configured` contains presence booleans only, never credentials. Safe provider status/error codes are included when available. The random `requestId` matches the `X-Contact-Request-Id` response header; it is not a saved inquiry ID. No email, message, image URL, IP, raw SDK error, or token is logged.

Ordinary `npm run dev` bypasses distributed Contact us rate limiting; production runs it. Successful local form submission therefore does not prove Vercel's Upstash configuration works. Missing variables, wrong deployment scope, stale deployment, rejected credentials, network errors and Supabase errors can all differ despite using the same intended credentials. Do not disable protection or assume every 503 is Upstash.

Configured-origin check (not a client-supplied Host allowlist), honeypot, bounded streaming body (768 KiB), strict field/document validation, 5–5,000 characters, up to 3 JPEG/PNG/WebP images of at most 150 KiB each, private storage, request-ID/digest idempotency. Browser targets approximately 100 KiB WebP; readable output takes priority within the server ceiling.

Upstash production limits: 5 attempts / 10 minutes per hashed client IP and 100 / hour across the environment. Vercel-provided forwarding is used only on Vercel; non-Vercel production uses a shared conservative source bucket. SDK timeouts fail closed. Existing in-process concurrency guards supplement, not replace, distributed limits. Preview and Production counters use separate namespaces.

## Release checks

Run unit tests, lint and a production build in an isolated temporary copy so the local port 3003 development server keeps running. Smoke-test built public pages and 404 responses for experiment pages/APIs, plus both public forms with plain/rich/image submissions and retry/error states. Never commit `.env`, secret values, dependency folders, or build output.

Before accepting real enquiries, replace placeholder contact details and confirm business claims, configure the environment above, and verify a real submission on the deployed domain. GitHub push and Vercel deployment success are separate checks.

### Verified locally on 2026-09-11

- Clean `npm ci` and optimized production build in an isolated copy using Node 24.12.0 / Next 15.5.25. Lint has no errors; existing font/image advisory warnings remain.
- 123 unit tests passed. PostCSS is overridden within its existing major version to the patched project dependency; clean-install audit reports 0 vulnerabilities without a Next.js major upgrade.
- Production runtime: public homepage/FAQ/consultation respond successfully; 21 archived page/API access checks return 404; existing consultation-result redirects remain intact.
- Opt-in `tests/production-release.mjs`: TWO `RELEASE CHECK` records and ONE tiny private image saved; text/newlines, rich JSON/image width, byte-for-byte image retrieval, duplicate-free retry and real Upstash rejection verified. No email sent. These synthetic records are retained for inspection, not deleted.
- Public-key database read is denied (`42501`); inquiry bucket remains private. No database schema, grant, bucket policy or auth setting was changed for release.
- Browser checks on the production build cover homepage and FAQ rich/plain forms, image compression (87,100-byte fixture), error/retry/draft preservation, Escape close, responsive layout, FAQ search/accordions and assessment CTA colors. Local archive search/filter/navigation tests also pass.
