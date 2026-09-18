# Island launch wishlist

## Data and deployment

- Migration: `supabase/migrations/20260918052930_create_island_wishlist.sql`.
- Table: `public.island_wishlist`; identity ID, email, island_code, other_island, created_at, status, notified_at, source, consent_version.
- Supported codes: BB, LC, GD, KN, OTHER. OTHER requires a territory name. Email and other territory are normalized to lower case.
- Unique email + island + other territory prevents duplicate requests. Repeats return the same success response and never overwrite notified/unsubscribed states.
- RLS enabled, no public policies; anon/authenticated table and sequence privileges revoked. Service-role writes through the server only. No public listing endpoint.
- Apply with `supabase db push --linked` after inspecting `--dry-run`; do not apply schema edits separately in the dashboard.

## Request flow

`POST /api/island-wishlist`: same-origin allowlist from SITE_URL/Vercel, 4 KB JSON limit, bounded body read, server-side validation, Redis limit, Supabase write. Successful writes replace only the form area with an inline acknowledgement. Failures preserve input and offer retry. No login, attachments or modal.

`CONTACT_UPSTASH_ENABLED` also controls the wishlist. Redis namespace `xunneng:wishlist:v1:<environment>` is independent of contact quotas: 5 requests / 10 minutes per source, 100 / hour overall. Trusted IP is taken only from Vercel; local/non-Vercel hosts share a conservative source quota. When enabled, missing Redis configuration or dependency failure blocks the request with a retryable error. Uses existing UPSTASH_REDIS_REST_URL/TOKEN and SUPABASE_URL/SERVICE_ROLE_KEY; no new secrets.

## Notification scope

This feature records launch notification requests. It does not send immediate confirmation emails, create campaigns or automatically detect service launches. When a territory launches, staff must arrange notification, record notified_at/status, and honor withdrawal requests. No claim that an email has already been sent is shown to visitors.

## Verification

Unit tests: `node --conditions=react-server --import tsx --test tests/island-wishlist.test.ts`.
Live verification should use clearly marked @example.com test addresses and remove only those exact rows afterwards. Never send emails during verification.

Reference: https://supabase.com/docs/guides/deployment/database-migrations
