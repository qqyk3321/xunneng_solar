# Consultation email QR production release — 2026-10-12

The consultation email QR is live for Antigua and Dominica, covering both new
Tally submissions and employee-initiated resends. The centered 200px PNG includes
the company logo, brand colors and transparent rounded corners, with no visible
scan caption. Resend delivers it as an inline CID attachment. The quote and
WhatsApp buttons remain available.

Same-day alignment update: the quote button, QR and WhatsApp button share the
horizontal centerline, as do the Submission ID heading and reference. The
updated template was published and read back to confirm that production HTML
matches the verified local render. Browser previews at 660px, 390px and 320px
confirmed the alignment without horizontal overflow. This template-only update
requires no function redeployment.

## Published components

- Resend template `solortide-consultation-received`, ID
  `650bda63-3534-4206-8c94-4002cb956f58`, published with optional
  `PREVIEW_QR_HTML` and an empty fallback for older stored retry payloads.
- Business Supabase project `thiqsnscgdjwihcfpomw`:
  `tally-webhook` version 27 and `staff-resend-consultation` version 5, both active.
- The template was published before the functions. No database migration or
  environment-variable change was required. Other functions retained their
  versions. This release did not deploy the website.

## Production verification

Signed synthetic Tally submissions exercised the production webhook for AG and
DM. The same consultations then exercised the authenticated production staff
resend endpoint. All four messages reached Resend's `delivered+…@resend.dev` test
sink and reported `delivered`.

For each delivered email, the rendered HTML referenced the expected CID, and
the provider attachment metadata reported `image/png` and `inline`. The actual
delivered attachment decoded at its displayed 200px size to the exact regional
preview URL in that email. The preview token matched its stored authorization
hash. Centering, rounded markup, the removed caption, and template substitution
were also checked.

Replaying each signed webhook and each staff request preserved the accepted
delivery without creating another send record. Unsigned webhook requests and
unauthenticated staff requests were rejected. Synthetic submissions and their
dependent tokens and email audit rows were removed after verification. Existing
customers were not emailed.

Both isolated deployment snapshots passed Deno type checking before publication.
Mailbox-client rendering in Gmail or Outlook was not part of this release test.

## Recovery reference

Pre-release function sources (webhook v26, staff v4), the published template
before/after, isolated deployment sources, and private verification receipts are
stored locally under `/tmp/solortide-email-qr-release-20261012`. These artifacts
contain test preview links and must not be committed or published. The release
directory is temporary; retain it securely if a longer rollback window is needed.

Restoring the previous senders can retain the new template because the QR
variable falls back to an empty string. Before rolling back, check pending sends:
do not change a retry's payload under an existing provider idempotency key, and
do not replay accepted customer deliveries.
