# Submission ID display

One ID is used across the consultation flow:

- Tally embed: `Tally.FormSubmitted.payload.id` (after submit only).
- Tally webhook: `data.submissionId` → `tally_form_submissions.submission_id`.
- Resend hosted template: `SUBMISSION_ID`, populated from the stored intake row.
- Website preview: reads `submission_id` only after validating its private token.

The success screen and preview use `SubmissionReference`, with selectable text,
a Copy button and a manual-copy fallback. Missing embed metadata does not block
the success screen: users are directed to their confirmation email for the ID.
No ID is fabricated and the ID is not an access credential. No new DB column is
needed. Existing records appear automatically; historical emails do not change.

## Email

Template `650bda63-3534-4206-8c94-4002cb956f58` has a Submission ID row above
Submitted at / Expected reply by. Both regional support addresses are preserved.
Publish the template before deploying a webhook that sends the new variable.

The existing independent `email/` workspace is excluded from this repository's
Git tracking. Its updated template, publish script and render test remain there:

- `email/templates/consultation-received.tsx`
- `email/src/push-template.ts`
- `email/src/consultation-email.test.ts`

Run `node --import tsx --test src/consultation-email.test.ts` from `email/`.
For a deliberate production update, run `npm run template:push` there with
`RESEND_TEMPLATE_ID` set to the verified template ID. Do not resend historical
customer emails as a deployment test. Use Resend's `delivered@resend.dev` sink.

## Website checks

- `tests/submission-reference.test.ts`: payload validation and field mapping.
- `tests/consultation-progress.browser.cjs`: both countries, phone and desktop,
  using stub Tally submission events (no real enquiry or email).
- Existing-link browser checks compare the rendered ID to its DB record without
  logging private tokens, URLs, IDs or customer data.

Website changes still require the usual Git/Vercel release independently of
Resend template publishing and Supabase Edge Function deployment.
