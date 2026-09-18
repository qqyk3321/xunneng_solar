# Submission ID display

One ID is used across the consultation flow:

- Tally embed: `Tally.FormSubmitted.payload.id` (after submit only).
- Tally webhook: `data.submissionId` → `tally_form_submissions.submission_id`.
- Resend hosted template: `SUBMISSION_ID`, populated from the stored intake row.
- Website preview: reads `submission_id` only after validating its private token.

The success screen uses `SubmissionReference`, with selectable text and no Copy
button or contact hint. The preview uses a single details panel with the yellow
ID above two single-line timestamps and no Copy control or time-zone caption.
On desktop, a compact 320px left sidebar contains ALL STEPS COMPLETE, the three
completed steps, the ID and timestamps. The wider right column contains the
Tally preview, aligned at the top. Below 960px the panels stack. The iframe
fills the available viewport height with a 640px minimum; internal scrolling
remains enabled so remote content is never clipped. This is not a promise of
content-driven height: Tally submission previews do not use the form embed
runtime here. Header, footer and the loading indicator are retained.
Missing embed metadata does not block
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

## Time formatting

The website and Edge Function share `submission-time.ts`. They use the actual
Tally `submitted_at` instant and format it in `America/Antigua` or
`America/Dominica`, never the viewer's browser time zone. Display format:
`18 Sep 2026 · 2:41 AM AST` (no seconds, unambiguous month name).
The preview shows date and time together on one line without a visible time-zone
caption; calculation still uses the corresponding regional AST time zone.
