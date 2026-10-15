# Main-site Git → Vercel release workflow

## Source of truth

Main-site production is built from `main` in `qqyk3321/xunneng_solar` by the existing
Vercel GitHub integration (`solortide2026/xunneng-solar`, repository root).
Production URL: `https://www.solortide.com`; the bare domain redirects there.

Normal releases must follow this chain:

1. Start an authorized change on a `codex/` branch. Preserve unrelated local edits.
2. Stage explicit main-site paths; inspect `git diff --cached` and check for secrets.
   Never add real `.env` files, local credentials, staff-site sources, or social media
   assets. Separate backend deployments require their own authorization.
3. Verify the committed snapshot in a clean worktree: `npm ci`, `npm test`,
   `npm run lint`, `SITE_URL=https://www.solortide.com npm run build`.
   Do not copy production secrets into the build checkout. Browser checks must mock
   submissions; do not use real customers, send emails, or mutate live records.
4. Push the branch and inspect the Git-triggered Vercel Preview build when available.
   With publication authorized and checks passing, fast-forward `main` and push it
   without force. Check the remote tip again before pushing to avoid overwriting
   concurrent work.
5. Verify the resulting production deployment is `READY`, its Git commit SHA equals
   GitHub `main`, and the canonical alias points to that deployment. A successful
   push or build alone does not prove the public site has updated.
6. Run `HOME_TEST_ORIGIN=https://www.solortide.com node tests/seo-public.smoke.mjs`
   and the relevant browser regression tests. Record the commit, deployment ID,
   checks and any limitations. Do not claim GSC validation or ranking changes based
   only on HTTP/browser checks.

In Vercel, the project's **Deployments** view should show the commit and branch for
each release. `main` is the configured Production Branch. Git pushes deploy the
Next.js site only: they do not apply Supabase migrations or publish Edge Functions,
email services, or `ticket-query-local`.

## Failure and rollback

Do not use a CLI production upload to hide a failed Git-triggered deployment.
Diagnose the integration/build failure; leave the current working production live.
If a rollback is authorized, prefer a reviewed revert commit on `main`. An emergency
Vercel rollback/promotion must also be reconciled back into Git before the next
normal release; never force-push shared history.

## 2026-10-15 reconciliation baseline

- Starting GitHub/local `main`: `f40d2a3701e857cffd59db88df0235e9de453349`.
- Starting production: `dpl_EKgaV18x1CcDUZ9jZWfP4oY7BQ5U` (CLI release).
- All 865 uploaded source hashes matched the workspace before reconciliation.
- The commit preserves the already-live main-site source and removed-route state.
  Non-runtime local prototypes/design scripts and staff-only code are not part of
  this main-site synchronization. Shared imports and relevant backend source are
  versioned, but no remote backend/schema changes are run.
- Test assertions are aligned with the already-live contact wrapper, regional
  benefits copy and one existing 430,438-byte image. The general image budget stays
  400 KiB; the existing legacy image is bounded at 425 KiB.
- The retired-tools check verifies absence of public routes without requiring the
  local-only source archive to exist in a fresh checkout.

Final commit/deployment verification is recorded only after it actually succeeds.
