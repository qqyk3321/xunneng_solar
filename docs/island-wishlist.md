# Island launch wishlist

## Data and deployment

- Migration: `supabase/migrations/20260918052930_create_island_wishlist.sql`.
- Table: `public.island_wishlist`; identity ID, email, island_code, other_island, created_at, status, notified_at, source, consent_version.
- Supported codes: KN, LC, VC, GD, BB, SX, JM, BM, MS, TC, VG, SABA, BONAIRE, BS, KY, CW, OTHER. OTHER requires a territory name. Email and other territory are normalized to lower case. SABA and BONAIRE are distinct internal identifiers.
- Expansion migration: `supabase/migrations/20260924143918_expand_island_wishlist_locations.sql`. Adds St Vincent and the Grenadines, Sint Maarten and Jamaica to the existing allowed codes; no existing records or permissions change.
- Further expansion: `supabase/migrations/20260924151809_expand_wishlist_more_caribbean_islands.sql` adds the nine further territories. The selector displays all sixteen disabled flags without folding on desktop and mobile. Desktop uses full names; mobile uses compact labels with accessible full names. The wishlist lists all sixteen, plus Other.
- `lib/upcoming-islands.ts` supplies both the non-interactive Coming soon list and the homepage wishlist dropdown. These are planned locations, not selectable installation countries (AG/DM only).
- Unique email + island + other territory prevents duplicate requests. Repeats return the same success response and never overwrite notified/unsubscribed states.
- RLS enabled, no public policies; anon/authenticated table and sequence privileges revoked. Service-role writes through the server only. No public listing endpoint.
- Apply with `supabase db push --linked` after inspecting `--dry-run`; do not apply schema edits separately in the dashboard.

## Request flow

`POST /api/island-wishlist`: same-origin allowlist from SITE_URL/Vercel, 4 KB JSON limit, bounded body read, server-side validation, Redis limit, Supabase write. Successful writes replace only the form area with an inline acknowledgement. Failures preserve input and offer retry. No login, attachments or modal.

`CONTACT_UPSTASH_ENABLED` also controls the wishlist. Redis namespace `xunneng:wishlist:v1:<environment>` is independent of contact quotas: 5 requests / 10 minutes per source, 100 / hour overall. Trusted IP is taken only from Vercel; local/non-Vercel hosts share a conservative source quota. When enabled, missing Redis configuration or dependency failure blocks the request with a retryable error. Uses existing UPSTASH_REDIS_REST_URL/TOKEN and SUPABASE_URL/SERVICE_ROLE_KEY. The new email template ID is configured only in Supabase Edge secrets.

## Notification scope

New registrations send one automatic confirmation through `wishlist-confirmation`, using the published Resend template `solortide-wishlist-received`. The email shows the requested region’s PNG flag, name and original registration time in its local timezone (Other uses UTC), followed by a short preparation/update message. It has no resend or unsubscribe controls. Future launch campaigns are outside this feature.

`20261012055701_add_wishlist_confirmation_email.sql` creates `wishlist_confirmation_emails`. An AFTER INSERT trigger atomically creates a pending audit; existing records are not backfilled. The Next.js server dispatches only when its duplicate-ignoring upsert returns a newly inserted ID. It sends the server secret in the `apikey` header; the Edge Function uses `withSupabase({auth: "secret:*"})` with JWT verification disabled. No recipient or template can be overridden by a caller.

The Edge Function atomically claims `pending` → `sending` before calling Resend. It records attempt/completion timestamps, recipient snapshot, template ID, provider HTTP status, Resend email ID and a sanitized error code. Status is `accepted` only when Resend returns an ID; a timeout/ambiguous response is `unknown`, and a rejection is `failed`. Stale `sending` rows display as unconfirmed in staff. Accepted does not mean delivered. There is no delivery webhook or automatic retry; repeats never resend, including after failure. Registration is kept if dispatch fails.

Secrets: existing `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SITE_URL`; new `RESEND_WISHLIST_TEMPLATE_ID`. Template source: `email/templates/wishlist-received.tsx`; publish with `cd email && node --import tsx src/push-wishlist-template.ts`. Public PNG assets live at `/email-assets/flags/`. Deploy assets together with the site API after the schema, template and Edge Function are ready.

Staff `/wishlist` is available to all active employees and admins, with server authorization before service-key database access. It shows email, region/flag, registration time, latest attempt time and result/Resend ID; times follow the staff platform’s Beijing timezone. Newest first, ten rows per page. Existing requests show no email record. There are no filters, editing, resend, unsubscribe or campaign controls.

## Verification

Unit tests: `node --conditions=react-server --import tsx --test tests/island-wishlist.test.ts`.
Mail-flow unit tests: `node --import tsx --test tests/wishlist-confirmation.test.ts`.
Database checks: `supabase db query --linked --file supabase/tests/wishlist_confirmation.sql` (transaction rolled back; no emails sent).
Live email integration must use Resend’s sandbox recipient `delivered@resend.dev`, verify there is no matching existing row first, and remove only the exact test row afterwards. Never send to historical wishlist customers as a test. Reference: https://resend.com/changelog/sending-test-emails
Constraint-only verification: `supabase db query --linked --file supabase/tests/island_wishlist_locations.sql` clones the actual constraints into a temporary table, accepts all sixteen codes, rejects an invalid code and rolls back. It creates no real wishlist entries and also checks RLS and direct anon/authenticated insert privileges.
UI regression: `tests/upcoming-islands.browser.cjs` verifies mobile/desktop compact flags, non-interactive planned locations, all sixteen dropdown choices and a mocked submission.

Reference: https://supabase.com/docs/guides/deployment/database-migrations
