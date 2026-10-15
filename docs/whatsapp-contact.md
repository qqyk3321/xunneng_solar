# WhatsApp contact

- All countries share the public contact URL and number in `lib/site-contact.ts`.
- Desktop footer groups country navigation, a 112px QR, chat link and regional support email in a compact lower-left contact area. The right column centers the enlarged heading and assessment button without a card background. Two desktop vertical dividers and the bottom Solortide signature remain. Mobile footer and contact sections keep the QR dialog. The existing floating launcher offers WhatsApp or the original message action. No additional floating button, external widget script, API integration, automatic message or tracking is added.
- Links open `https://wa.me/8617605886812`. The WhatsApp FAQ/help URL is not a contact destination.
- The QR is a static, lossless PNG in `public/contact/whatsapp-qr.png` with the site's `app/icon.svg` logo. It is intentionally separate from WebP content photographs.
- After changing the number or logo, regenerate the general contact asset with `scripts/generate-whatsapp-qr.mjs`. It generates an H-error-correction QR with a quiet zone, composites the logo, and decodes the final result at original, 240, 208, 180, 140 and 112 px before saving. Consultation QR images are generated server-side at runtime; no QR generator is shipped in client JavaScript.
- Browser checks: `PLAYWRIGHT_MODULE=<path-to-playwright> PREVIEW_TEST_ORIGIN=<local-origin> node tests/whatsapp-contact.browser.cjs`.
- Tests inspect links without opening WhatsApp or sending messages. A physical phone scan remains a useful final acceptance check.

## Consultation preview contact and sharing

The customer submission page places **Discuss on WhatsApp** and **Share quote**
below the current quote. A consultation-scoped provider passes the same WhatsApp
URL and QR to the footer and floating contact dialog. All include the current
Submission ID; other pages retain the general contact link.

On desktop, **Use your phone** expands two locally generated PNGs: WhatsApp with
the submission reference, and the private quote URL. They are centered, with
rounded corners, a soft sea-salt background, dark teal modules, rounded teal
finder patterns and the company's actual sun/wave logo. The same image renderer
is used in the email and contextual contact entry points. Logo updates are built
from `app/icon.svg` by `scripts/build-consultation-qr-logo.mjs`.
On mobile (up to 700px or
a primary coarse pointer without hover, including landscape phones), QR controls
and images are hidden, including those in the floating dialog. **Share quote**
calls the native share sheet within the click event. Cancellation does nothing;
unavailable/failed sharing falls back to copying the quote URL. If clipboard
access fails, a selectable link remains available. No message is sent automatically.

The share target uses `SITE_URL` plus the authorized regional submission path.
The website accepts the same optional server-side `WHATSAPP_BASE_URL` as the email
senders. QR generation stays on the server; no QR encoder is sent to the browser.
The existing colors, fonts, button hover motion and dialog motion are reused;
QR expansion adds a short fade and respects reduced-motion preferences.

Checks: `node --import tsx --test tests/consultation-qr.test.ts` verifies PNG decoding
and deterministic email attachments. `tests/submission-contact.browser.cjs` uses
the loopback fixture backend and a site configured with matching `SITE_URL` /
`PREVIEW_TEST_ORIGIN`; it checks desktop scans, mobile sharing/cancel/fallback,
320px layout, landscape phones, legacy records and unchanged general contacts.
Set `QR_TEST_BROWSERS=chromium,webkit` when both browsers' system dependencies exist.
