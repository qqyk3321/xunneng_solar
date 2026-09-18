# Permanent consultation preview links

Consultation preview links have no automatic 30-day expiry. They remain private
bearer links: anyone possessing a link can view its submission until access is
removed. A submission ID alone does not grant access.

## Implementation

- Migration `20260918085300_permanent_consultation_preview_links.sql` sets existing
  `expires_at` values and the column default to PostgreSQL `infinity`.
- The legacy column is retained so already-deployed readers using `expires_at >
  now()` keep working during rollout. No token hashes or submission data change.
- The webhook writes `infinity` for new links and webhook retries.
- The website checks the stored token hash and matching country, without an age
  condition. Deleted token rows or missing submissions still show the not-found
  page without private content. Next.js streamed responses may retain HTTP 200.
- RLS and the existing service-role-only grants are unchanged. No public lookup
  by submission ID is introduced.

## Operations

Deleting the relevant row in `consultation_preview_tokens` through the Supabase
dashboard immediately removes access, without deleting the submission itself.
Do not replay that submission's webhook after revocation: the existing retry
workflow can regenerate its link. A future permanent revocation workflow should
use a separate revoked flag/tombstone if replay-proof revocation is needed.

Previously expired links whose token rows still exist become usable again.
Previously deleted rows are not recreated by the migration. Forwarded emails
retain working links; treat preview URLs as confidential. Tally-hosted content
must also remain available; this change controls our website's access deadline,
not Tally's retention or access policy.

## Deployment and checks

1. Run `supabase db push --dry-run` and confirm only the intended migration.
2. Run `supabase db push`, then deploy `tally-webhook` (preserving its existing
   signature verification and gateway configuration).
3. Publish the website reader change through the normal Git/Vercel workflow.
4. Confirm existing tokens have `expires_at = 'infinity'::timestamptz`, valid
   links still open, invalid tokens show the not-found page, and no confirmation email was
   sent merely by migrating.

Tests: `tests/consultation-preview-access.test.ts` and the read-only existing-link
browser check `tests/tally-preview.browser.cjs`.
