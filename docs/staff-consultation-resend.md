# Staff consultation email resend

Active employees and administrators can resend a consultation email from the employee detail page after confirming the stored recipient. The browser can submit only a request UUID. The employee API checks the session and same-origin request, loads the existing preview link, and supplies the authenticated employee identity to `staff-resend-consultation`.

The Edge Function accepts only a server secret API key through `@supabase/server` (`auth: "secret:*"`). It reads the recipient, reference, country and original submission time from the business database and verifies that the preview token is still authorized. It sends the same published Resend template used by `tally-webhook`. It does not change the webhook, publish a template, create preview tokens, change prices or promise a new reply deadline. The existing template links to the customer's current quote.

`consultation_email_resends` is a service-only table, with RLS and no public/authenticated grants. It records the initiating employee, status, provider ID and exact private email payload. The payload contains the customer preview URL and must never be exposed through a public API. The claim RPC uses invoker security and a transaction advisory lock per consultation. New operations have a 60-second cooldown; concurrent requests reuse the pending operation. Retries preserve the exact payload and provider idempotency key, and are spaced at least 15 seconds apart. Accepted operations are never replayed, even after the provider's retention window.

Timeouts remain pending rather than being reported as failed. The UI offers **Check send status**, which retries the same operation safely. An uncertain operation older than 23 hours is blocked from automatic replay. An administrator must first inspect Resend's delivery history, then resolve that specific audit row to `accepted` (with the provider ID) or `failed` only after confirming non-acceptance. Never mark an uncertain delivery failed merely to unlock the button.

## Deployment

Apply `supabase/migrations/20261010075854_add_consultation_email_resends.sql` to the business project `thiqsnscgdjwihcfpomw`. Deploy only this function:

```sh
supabase functions deploy staff-resend-consultation --use-api --no-verify-jwt --project-ref thiqsnscgdjwihcfpomw
```

The gateway JWT check is disabled for this server-to-server secret-key endpoint; the function's secret-key authentication remains required. See [Supabase service-to-service authentication](https://supabase.com/docs/guides/functions/auth). It uses the existing `RESEND_API_KEY`, `RESEND_TEMPLATE_ID`, `RESEND_FROM_EMAIL`, regional support emails and `SITE_URL` Edge secrets. The staff project needs no Resend key or new environment variables.

## Verification

- Root: `node --import tsx --test tests/consultation-resend.test.ts` and `npx deno check --node-modules-dir=none --no-lock supabase/functions/staff-resend-consultation/index.ts`.
- Database: run `supabase/tests/consultation_email_resends.sql` inside `BEGIN` / `ROLLBACK`; it exercises claim, replay, cooldown, preserved payload and access rules without sending emails or retaining audit rows.
- Staff: `npm test`, `npm run lint`, `npm run build`.
- Browser: `STAFF_RESEND_CLOUD_TEST=1 PLAYWRIGHT_MODULE=/path/to/playwright STAFF_TEST_ORIGIN=http://localhost:3015 node tests/submission-resend.browser.cjs`. This opt-in test creates a synthetic consultation and temporary employee, sends one message to Resend's `delivered+...@resend.dev` test sink, checks the audit/replay/cooldown, and removes its fixtures. Retry UI tests are intercepted. No existing customer is emailed.

Resend keeps provider idempotency keys for 24 hours; database completion records provide protection beyond that period. See [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
