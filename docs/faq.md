# Standalone FAQ

Current content: 17 questions, including qualified generator integration and future expansion under Equipment & support. These additions do not promise universal compatibility, grid export, or guaranteed returns.

URL: `http://192.168.1.176:3003/faq`.

English site page, separate from the homepage. Accessible without login in all environments; no deployment is performed by adding it. Links are present in the desktop homepage navigation, mobile header and footer. The test-page directory lists it under main business pages, not as an experiment.

## Content and behavior

- Edit questions, answers, categories, keywords and related links in `lib/faq/content.ts`.
- Editorial content: 17 questions across Getting started, Savings & sizing, and Equipment & support. Site-specific calculator facts reuse its configuration. Equipment support and battery reliability use qualitative wording. Warranty durations and cycle counts are not advertised; coverage and operating conditions follow the selected equipment’s written terms. Cleaning and reinforcement services have a separate answer, with no pricing or free-service promise. Detailed warranty terms, stock availability, wind-rating documents and installation timing are referred to the team instead of inventing terms.
- Search is local, immediate and covers questions, answers, category names and keywords. It is case-insensitive, normalizes punctuation/accents, and requires all entered words to match. Chinese feature keywords are supported without changing the English interface.
- Category filters combine with the query. Clear search preserves the topic; reset clears both and returns keyboard focus to the search field.
- Native question accordions support keyboard operation. Matching answers open automatically when searching. Empty results have a clear reset action and a contact route remains available below the list.
- No database, external search service, authentication, network search requests or analytics are added. Content is plain React text; queries are not injected as HTML.
- The homepage and FAQ share `SiteHeader`, including responsive navigation and the assessment CTA. Its navigation order is Savings, Why solar, Contact us, FAQ. From FAQ, Savings, Why solar and Contact us point to their homepage sections. “Contact us” specifically means the homepage contact area. “How it works” is temporarily removed; its future system-efficiency explainer is not built yet.
- Both pages also share `SiteFooter`: brand, email, phone, address, navigation, copyright/version and a bottom “Get Your Free Assessment” link to `/consultation`. `lib/site-contact.ts` is the single source for display contacts, including the inline form's email. The current email (`support@example.com`), phone (`+1 (268) 555-0100`) and address (`123 Example Street, St. John's, Antigua`) are placeholders, not verified business contacts; replace them before publishing. No mailbox, phone or map integration is provisioned.
- The bottom of FAQ reuses `HomepageContact` with `variant="question"`, titled “Ask a question / Still have a question?” at `#ask-question`. In development and production, visitors can submit email/plain text or open the rich-text/photo dialog. Validation, compression, retry behavior and the 48-hour receipt are shared with the homepage. Answer-level links scroll here, not to homepage Contact us. Both forms use the write-only `POST /api/contact`; data review stays local-only. See [release configuration](./vercel-release.md).

## Verification

```bash
node --import tsx --test tests/faq.test.ts tests/test-pages.test.ts
npx tsc --noEmit
PLAYWRIGHT_MODULE=/path/to/playwright node tests/faq.browser.cjs
HOME_CONTACT_PATH=/faq PLAYWRIGHT_MODULE=/path/to/playwright node tests/home-contact.browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/test-pages.browser.cjs
```

Browser checks cover search, automatic answer expansion, topics, no-results/reset, keyboard accordion controls, 320/375/768/1280px widths and homepage links on desktop/mobile. No form submission or backend request is made.
