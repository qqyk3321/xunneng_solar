# Homepage Contact us preview

> Release update: the homepage and FAQ forms now work in production through `/api/contact`; there is no consultation-link fallback. Earlier local-only UI notes below describe the prototype. Current environment and security requirements are in [the release guide](./vercel-release.md).

Entries: `http://192.168.1.176:3003/#contact-us` and `http://192.168.1.176:3003/home-preview#contact-us`.

Read all saved messages in the independent [Contact submissions test workspace](./contact-submissions-preview.md): `http://192.168.1.176:3003/contact-submissions-preview`. It requires no login in development and provides sorted/paginated metadata and a separate read-only Preview for every record.

The Contact us section is passed through the optional `DemoHomepage.contactSlot`. The approved [homepage redesign](./homepage-redesign.md) also places it on `/`: development uses the existing form; outside development the homepage provides a consultation link instead of enabling the test submission API. `/home-preview` keeps its development-only form and optional signed-in email default. No sign-in is required to submit; a signed-in email is merely a convenience default, not proof of identity or ownership.

## Experience

- Homepage Contact us and FAQ Ask a question no longer display the old test badge or sample-data instruction. This is a presentation change only; development-only submission guards remain unchanged. Both show the shared `SupportEmail` component: `support@example.com` is an intentionally non-operational placeholder, not a configured receiving mailbox. Replace `SITE_CONTACT.email` in `lib/site-contact.ts` before publishing; the shared footer reads the same value. It does not prefill or replace the visitor's reply email.
- Inline: required email + plain-text message, Send message, Add photos.
- Add photos opens a native modal dialog and carries over the current email/text. The English toolbar reuses official Tiptap UI: headings 1–3, bullet/ordered lists, quotes, bold/italic/underline/strike, paragraph alignment, photos, undo and redo. Dropdowns are portaled inside the native dialog. There is no Preview action.
- Photos initially fit within 280 × 180 CSS pixels without upscaling, on their own line. The official Tiptap `ResizableNodeView` supplies aspect-ratio-preserving resizing; the bottom-right handle also supports left/right arrow keys and touch pointers. A small adapter retains the private image ID and saves an optional integer width (40–1600) in document JSON, never an arbitrary style or URL. Images still fit narrower screens. Display resizing does not recompress or enlarge the uploaded file.
- The dialog locks background interaction/scrolling and contains keyboard focus. Escape, close, and Keep draft & close preserve the draft. Closing is disabled while processing/sending.
- Once opened, the rich draft stays rich, even when there are no photos; the inline area shows a short draft summary and Continue editing. There is no lossy rich-to-plain conversion.
- A draft survives modal close/reopen, not a full page refresh or navigation. This is stated in the UI.
- File selection, paste and drop use the same local compression path: up to 3 JPEG/PNG/WebP inputs, 10 MiB per input, target approximately 100 KiB, hard upload ceiling 150 KiB. Only compressed images are uploaded, only on Send message. Undo can restore removed photos while the draft is mounted.
- Success appears only after a valid server receipt: “We’ve received your request.” and a reply by email within 48 hours. Inline shows a success card; the dialog shows the same success state with Done. Send another message resets the completed draft.
- No online replies or automated emails. The 48-hour response is a service promise, not an automated workflow. Test feature notice requests sample data only.

## Persistence

`POST /api/contact` is the production write-only endpoint shared by homepage and FAQ. It uses the existing validation and append-only `saveInquiry`, configured-origin validation, and distributed Upstash limits in production. Historical `/home-preview/contact` remains local-only for compatibility; no public form calls it. See [release configuration](./vercel-release.md). All public failure messages are English.

`anonymous_inquiries_preview.format` is an optional new column, checked to be `plain` or `rich`. Existing rows remain null and untouched. New homepage submissions require the format; a plain submission cannot carry formatted nodes or photos. `message` contains text for both modes; `content` keeps canonical JSON for compatibility, including a simple text document for plain submissions. Future readers can use `format === 'plain'` to display escaped `message` with preserved newlines; rich readers use the existing Tiptap read-only component.

Each new message has a new UUID. The same UUID + same content retry returns the original receipt instead of creating another record; changing format changes the payload digest as well. The single-record `/rich-text-preview` experiment is not used here.

No new bucket, public storage policy, account relationship, queue, or ticket system. Existing private bucket and server-only service-role access remain in use. RLS and table grants are unchanged.

Schema setup (already applied in the linked testing project):

```bash
supabase db query --linked --file scripts/anonymous-inquiry-format.sql --output json
```

## Verification

```bash
node --conditions=react-server --import tsx --test tests/home-contact.test.ts
PLAYWRIGHT_MODULE=/path/to/playwright node tests/home-contact.browser.cjs
# Opt-in live test: creates TWO synthetic messages and ONE compressed image; sends no emails.
HOME_CONTACT_LIVE_WRITE=1 PLAYWRIGHT_MODULE=/path/to/playwright node --env-file=.env tests/home-contact.browser.cjs
```

Browser tests run on `/` by default (set `HOME_CONTACT_PATH=/home-preview` to exercise the account preview) and cover English validation, plain success, failed/lost receipt and retry, transfer into the modal, focus containment, body scroll lock, heading/list dropdowns, small default photos, aspect-ratio-preserving drag, keyboard resizing, resize undo/redo, image removal/undo, preserved drafts, no Preview action, English modal text, mobile sizes, rich success, and reset. The live option additionally verifies actual rows (including saved image width), plain/rich format, duplicate-free retry, and Storage bytes matching the submitted compressed image. It never starts a dev server.
