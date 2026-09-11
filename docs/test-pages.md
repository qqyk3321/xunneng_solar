# Test-page directory

Entry: `http://192.168.1.176:3003/test-pages`.

This is an independent, English, local experiment archive. It has no authentication/database dependency and does not preload linked pages. All links open a new tab. The directory and every archived route (including child APIs, callbacks and exports) return 404 outside development. Vercel Preview is also production mode, not local development.

## Inventory

The current 11 archived page routes are grouped into solar calculators, homepage/account, message review/legacy forms, images/rich text and record-specific previews. Search is local and matches titles, descriptions, route paths and Chinese feature keywords. Message review can include real customer data and must stay on a trusted local network.

`/`, `/consultation`, `/faq` and homepage Contact us are separate main-business shortcuts, not experiments. Both public forms submit to `/api/contact` in production.

Record-specific routes are included without invalid placeholder links:

- `/contact-submissions-preview/[id]` opens the Contact us list so the user can select a message.
- `/submission-preview-test` is classified as a production customer-result route, not an archived test. It still requires all three combined Tally IDs and remains available from existing result links.
- `/auth-preview/update-password` can be opened directly to test missing-session UI; a valid account/recovery session is required to save a password.

Backend APIs, email callbacks and raw design assets under `demo/` are not standalone navigation pages. Independent services on other ports are outside this main-site directory.

## Add a new test page

1. Add its metadata to `lib/test-pages/catalog.ts`: canonical page route, title, short description, category, access requirements and a valid navigation target.
2. For a route requiring parameters or an existing record, point its navigation target at the selection page and explain the requirement. Do not invent a record ID.
3. Add optional shortcuts and search keywords. Add a warning if the test sends email, stores shared data or overwrites earlier test data.
4. Run `node --import tsx --test tests/test-pages.test.ts`. The inventory test compares the catalog with all `app/**/page.*` routes, catching pages that were added but not registered. New pages are not auto-published or automatically given navigation access.

```bash
node --import tsx --test tests/test-pages.test.ts
PLAYWRIGHT_MODULE=/path/to/playwright node tests/test-pages.browser.cjs
```

The browser test checks search, category filters, empty results, mobile widths, no background requests to test pages and opening a new tab. The click destination is stubbed: this test does not read or write cloud data, send emails or start any server.
