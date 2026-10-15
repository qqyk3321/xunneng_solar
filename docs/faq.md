# Regional FAQ

Public routes: `/antigua/faq` and `/dominica/faq`. The generic `/faq` route is retired. Both regions share the same directory layout and 26 editorial questions across Getting started, Savings & sizing, Equipment & support, and How the system works. Country-specific tariff text and destinations are resolved server-side by `getFaqItems`.

## Content and interaction

- Questions, complete answers, categories, keywords and related destinations live in `lib/faq/content.ts` and `lib/faq/hybrid.ts`. This UI cleanup does not change them or introduce technical/financial promises.
- Search is local and immediate; it covers questions, answers, category names and keywords, normalizes accents/punctuation, and requires all entered words to match. Search combines with the selected category. Clear search retains the category; Reset search & topics clears both and restores search focus.
- Native question disclosures support mouse and keyboard. Search results open automatically. Empty results retain a reset action. Result counts are announced through the live region.
- The site header/footer retain regional destinations. Contextual diagram/calculator/assessment links remain in answers. Repeated same-page Ask a question links are hidden; the contact launcher provides the same route.
- The question form uses the existing public write-only contact flow, privacy consent, draft preservation, image compression and rich editor. No actual enquiry is sent during UI verification.

## Mobile FAQ and shared Contact us — 2026-10-13

- Through 1000px, use the short FAQs heading, Search questions field and a native category selector. Remove the old introductory copy, redundant jump link and multi-line category buttons. Keep the original question cards, all 26 complete answers and search/category behavior.
- Search and category controls are 48px tall with 16px input text. Question titles are 16px; answers use 15px/1.7. Put the expand indicator at the left, clear of the floating contact launcher. Expanded answers grow naturally without a fixed-height container. Category changes stay in place on mobile.
- At 390×844, the first question begins around 285px instead of 721px; roughly six complete questions are visible instead of one. Desktop question layout remains as below.
- Replace the former Still have a question? area with the regional homepage's shared Contact us on all screen sizes: the approved solar-team introduction and 24-hour response, regional support email and directly visible WhatsApp QR on desktop. Phones hide those contact details/QR, keeping the form and floating contact popup.
- Follow-up alignment: the email and WhatsApp form two left-aligned rows; the right-hand QR is vertically centered against that pair. The same shared layout applies to both regional homepages.
- FAQ contact loads after 1.2 seconds on all devices, making the existing popup available near the top. Its Prefer email action still scrolls to #ask-question; the popup remains available near the mobile form. Cookie/region-dialog exclusions remain. Page-form success also says 24 hours; the independent floating message editor retains its existing copy.
- No changes to contact storage, validation, photo compression, consent or rich-message drafts. A direct regional-homepage comparison confirmed unchanged mobile Contact us content, geometry and styles.
- Evidence: `design/faq-mobile-20261013/`. Scoped lint, existing FAQ checks, 320/390/768/1440px interactions and mocked submissions passed. One independent touch/visual review found no blocking issue. No real enquiries or messages were sent.

## Desktop cleanup — 2026-10-13 (preceding release)

User scope: optimize Web first, continuing the existing site’s restrained copy/layout direction. Implementation decisions below apply above 1000px only.

- Preserve the brand fonts and original rounded question cards. Use the green/white surfaces and dark teal text of the recently refined regional pages.
- One heading without a final period; hide the opening slogan and redundant How it works link. Put search at the top of the answer column, with categories alongside it. The first question starts around 287px at 1440×1000, previously 490px.
- Categories stay visible while scrolling the list. Selecting a topic after scrolling down returns the search/results to just beneath the fixed header; switching at the top stays in place. At 1001–1280px, the list leaves space beside the existing contact launcher so question expand controls remain clear. Remove visible topic counts, Browse by topic, duplicate search label and idle “answers to explore”; keep accessible labels/live results and show the count during search.
- Use a single Still have a question? heading for the contact area, one sentence about sending a question and the existing 48-hour email response, and retain regional email/WhatsApp and the form. Hide the empty character count, restoring it within 500 characters of the limit.
- Load the existing FAQ contact component after 1.2 seconds on desktop so its floating WhatsApp dialog is usable without first reaching the bottom. Its Prefer email action still leads to the form; Cookie and region-dialog exclusions remain.
- Phone and tablet layout/copy/initial lazy-loading behavior are unchanged. The 390px screen, full-page and contact screenshots match the production baseline pixel for pixel.

The subsequent mobile/shared-contact update above supersedes this release's contact wording and mobile/loading restrictions.

## Verification and evidence

- Existing browser checks: `tests/faq.browser.cjs` (both regions at 390/1440px).
- Focused desktop checks: search plus category, no-results/reset, keyboard disclosure, sticky topic list, country-specific answer text, popup close/focus and email route, rich-message draft preservation, no horizontal overflow/client errors at 1024/1440px.
- Scoped ESLint and deployment build/type checks. No full suite or repeated three-round testing, following the user’s request for proportionate checks.
- Before/after images, comparison page, review and release record: `design/faq-desktop-20261013/`.
