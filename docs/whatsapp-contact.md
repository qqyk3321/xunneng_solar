# WhatsApp contact

- All countries share the public contact URL and number in `lib/site-contact.ts`.
- Desktop footer groups country navigation, a 112px QR, chat link and regional support email in a compact lower-left contact area. The right column centers the enlarged heading and assessment button without a card background. Two desktop vertical dividers and the bottom Solortide signature remain. Mobile footer and contact sections keep the QR dialog. The existing floating launcher offers WhatsApp or the original message action. No additional floating button, external widget script, API integration, automatic message or tracking is added.
- Links open `https://wa.me/8617605886812`. The WhatsApp FAQ/help URL is not a contact destination.
- The QR is a static, lossless PNG in `public/contact/whatsapp-qr.png` with the site's `app/icon.svg` logo. It is intentionally separate from WebP content photographs.
- After changing the number or logo, run `node scripts/generate-whatsapp-qr.mjs`. It generates an H-error-correction QR with a quiet zone, composites the logo, and decodes the final result at original, 240, 208, 180, 140 and 112 px before saving. QR packages are development-only; no QR generator is shipped in client JavaScript.
- Browser checks: `PLAYWRIGHT_MODULE=<path-to-playwright> PREVIEW_TEST_ORIGIN=<local-origin> node tests/whatsapp-contact.browser.cjs`.
- Tests inspect links without opening WhatsApp or sending messages. A physical phone scan remains a useful final acceptance check.
