# Contact us submissions: read-only test workspace

Open `http://192.168.1.176:3003/contact-submissions-preview`.

This independent English test page lists **all** rows in `anonymous_inquiries_preview`, including older `/contact-preview` tests. It does not filter by the signed-in email and requires no login. It does not read the separate singleton `rich_text_single_preview` table. The original homepage and existing submission endpoints are unchanged.

## List and preview

- Columns: email address, original submission time (UTC), format, Preview.
- Default: newest first, 10 rows per page. Page sizes: 10, 25, 50.
- Click the email or submission-time heading to sort the entire collection in either direction. The UUID breaks ties consistently. Sorting and changing page size reset to page one.
- Pagination is displayed in the frontend; Supabase performs sorting and range selection. The list only fetches metadata, not every message body or image. A count query lets stale page numbers fall back to the last available page.
- Preview opens `/contact-submissions-preview/[id]` in a new tab. This renders the existing record; it does not create a new record, generate a persistent HTML file, or replace an earlier form. Back to submissions retains the list page, size and sort parameters.
- Quick preview opens the same saved content in a native modal without changing the list URL, page or sort order. Close with the X button, Escape or the backdrop. Background interaction/scrolling is locked, keyboard focus stays in the modal, and focus returns to the triggering button on close.
- The modal fetches `/contact-submissions-preview/[id]/data` only when opened. This read-only endpoint is also development-only, returns `private, no-store`, and excludes raw attachment metadata. Closing aborts the client request; reopening or Refresh preview fetches fresh data and photo links. Temporary failures offer Try again. Both preview modes reuse `SubmissionContent` rather than maintaining separate renderers.
- Plain text is rendered as escaped text with line breaks preserved. Rich text uses the shared `InquiryRichContent` Tiptap read-only component, with English labels and no editing/resize controls. Saved image widths are respected within the viewport.
- Legacy rows without the `format` field use rich rendering if document JSON exists; otherwise they use plain text and a separate attachment gallery. No migration is needed.
- Refresh reloads saved data. A failed query is not presented as an empty list. Invalid/missing IDs show a not-found page. Image signing failures retain readable text and show a warning.

## Downloads

The list, standalone preview and modal all offer **Download** with two options:

- **Original JSON (.json)** exports the stored form fields (`id`, `email`, `created_at`, `format`, `message`, `content`, `images`) without normalizing the document or replacing attachment metadata with signed links. This preserves saved attributes and literal string newlines (escaped according to JSON syntax). Internal retry hashes and credentials are not exported; this is a form export, not a database backup. No image signing is needed.
- **Text & image links (.txt)** includes the email, submission reference, original submission time, export time and readable message. Rich content is walked in document order; image links appear at their original positions. Paragraph boundaries, empty paragraphs, hard breaks and literal newlines are not trimmed or collapsed. Lists retain simple numbering/bullet prefixes. Plain messages retain their exact string, including CRLF; legacy attachments are listed after the message. Formatting such as bold or alignment is omitted.

The text file contains private signed image links, **not downloaded image binaries**. Links last approximately one hour after export; download again to renew them. Share exports only with intended recipients. If signing fails, text export returns a retryable error instead of silently exporting missing links; original JSON remains available.

`GET /contact-submissions-preview/[id]/download?format=json|text` is read-only, development-only and `private, no-store`. Formats and IDs are allowlisted, filenames use only the validated reference, and successful responses use attachment headers with UTF-8 JSON/text MIME types. The UI checks success before saving a file, keeps the current page unchanged, and aborts unfinished downloads when unmounted. Dropdown menus are mounted inside the active modal when applicable.

## Test-only access and storage

Anyone who can reach the development server can see these email addresses, messages and photos. **Use synthetic data only. This is not a production staff dashboard.**

The layout, pages and server reader enforce the development-only restriction. Pages are dynamic, reads use `no-store`, and search engine indexing is disabled. These are safeguards for a local test page, not substitutes for authentication before any future deployment.

The service-role key remains server-only. Existing private bucket policies and RLS are not modified. Only files whose validated paths belong to the selected submission can receive temporary one-hour signed URLs. Invalid paths, foreign submission paths, singleton test paths and unbound rich-text image references are rejected. Image URLs are created only when opening a preview, never for the table. Refresh renews the links; it does not delete files.

No schema change, public bucket, authentication change, submission mutation, email sending or cleanup task is introduced.

## Verification

```bash
node --conditions=react-server --import tsx --test tests/contact-submissions-preview.test.ts
node --conditions=react-server --import tsx --test tests/contact-download.test.ts
# Reads existing test rows and images; does not create or delete anything.
PLAYWRIGHT_MODULE=/path/to/playwright node --env-file=.env tests/contact-submissions-preview.browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node --env-file=.env --import tsx tests/contact-download.browser.cjs
```

The unit tests cover parameter allowlists, safe attachment binding, legacy content, development guards, stable sorting, range pagination, count/list failures, missing IDs and partial image failures. The browser test covers actual database records, pagination/sorting/page sizes, new-tab previews, unchanged saved text, rich read-only behavior, signed images, saved widths, mobile layouts and invalid links. It never starts a server.

Supabase reference: [range selection](https://supabase.com/docs/reference/javascript/using-modifiers-range), [private signed image links](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurls).
