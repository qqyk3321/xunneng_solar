# Caribbean homepage — local review

## Scope

- `/` is a neutral Caribbean entry page, not an Antigua alias.
- `/antigua` and `/dominica` retain their existing content and business flows.
- No database, form, authentication or deployment changes.
- Root metadata/canonical and sitemap now identify `/` separately. Regional home hreflang x-default points to `/`.
- Savings opens a country chooser and links directly to the corresponding `#calculator`; assessment goes to the selected country's consultation page.

## Trust and content

Review refinements: a non-interactive expansion panel explicitly describes more Caribbean locations as forthcoming. The generic “The details behind a better decision” section has been removed pending verifiable supporting material. The carousel now asks what users want solar to do for their homes, rather than resembling customer success stories. “Explore all FAQs” links directly to `/faq` without a country-selection gate.

Five service steps explain activities and takeaways. Generated photographs are explicitly illustrative. The carousel shows application scenarios, not completed projects, reviews or quantified outcomes. Replace with verified customer material only after obtaining permission; do not remove disclosure while generated images are used as examples.

The root hero reuses the existing local Caribbean solar image. Region-specific certification, tariff and warranty details remain in regional pages. No invented awards, partners, reviews or activity timestamps.

## Interaction

The root now renders the shared `SiteHeader` in Caribbean mode rather than maintaining a separate header. It also uses `SiteRegionProvider`'s existing country modal for location switching, Savings and assessment. The shared chooser accepts an optional intent; confirmation routes to the selected country's calculator or consultation without altering ordinary regional switching. No root email is displayed. The duplicate root modal and its CSS were removed.

Desktop: sticky image follows the five readable steps. Mobile: each step has its own image. The scene carousel is manual (buttons/swipe), with no timed reading pressure; transitions respect reduced motion. Country dialog uses native focus trapping and Escape, plus page scroll lock. Cookie UI remains the existing demo component.

## Image provenance

Generated with the built-in image_gen tool, reviewed visually, and resized/encoded to WebP using Sharp (1200px, quality 82). Original generated PNGs remain untouched outside the repository. Project assets: `public/images/caribbean/`.

Final prompt set:

### enquiry.webp

Use case: photorealistic-natural. Asset type: wide landscape editorial website photograph, 3:2. A Caribbean homeowner using a laptop on a shaded veranda to enquire about solar, a small cream home, palms and sea in the distance. Screen not readable. Premium but natural architectural photography, genuine material texture, soft tropical daylight, restrained teal, warm cream and green palette. This is an illustrative service scene, not a real documented project. No logos, captions, watermark, collage or text. Single photograph.

### review.webp

Use case: photorealistic-natural. Asset type: wide landscape editorial website photograph, 3:2. A Caribbean solar engineer in a teal polo thoughtfully checking roof drawings and a laptop at a bright tidy professional office. No readable text. Premium but natural architectural photography, genuine material texture, soft tropical daylight, restrained teal, warm cream and green palette. This is an illustrative service scene, not a real documented project. No logos, captions, watermark, collage or text. Single photograph.

### survey.webp

Use case: photorealistic-natural. Asset type: wide landscape editorial website photograph, 3:2. A Caribbean engineer in a safety helmet and teal shirt beside a homeowner in the garden of a Caribbean home, evaluating the roof with a tablet. Premium but natural architectural photography, genuine material texture, soft tropical daylight, restrained teal, warm cream and green palette. This is an illustrative service scene, not a real documented project. No logos, captions, watermark, collage or text. Single photograph.

### installation.webp

Use case: photorealistic-natural. Asset type: wide landscape editorial website photograph, 3:2. Two Caribbean solar installers in safety helmets and properly anchored harnesses installing photovoltaic panels on a low metal roof, lush hills and sea behind, believable safe working practice. Premium but natural architectural photography, genuine material texture, soft tropical daylight, restrained teal, warm cream and green palette. This is an illustrative service scene, not a real documented project. No logos, captions, watermark, collage or text. Single photograph.

### handover.webp

Use case: photorealistic-natural. Asset type: wide landscape editorial website photograph, 3:2. A Caribbean engineer explaining a neatly installed battery and inverter to a homeowner in a shaded utility room, reviewing a tablet together, greenery outside. Premium but natural architectural photography, genuine material texture, soft tropical daylight, restrained teal, warm cream and green palette. This is an illustrative service scene, not a real documented project. No logos, captions, watermark, collage or text. Single photograph.

## Validation

- `npm test`
- `npx --no-install tsc --noEmit --incremental false`
- `PLAYWRIGHT_MODULE=/path/to/playwright node tests/caribbean-home.browser.cjs`
- Production build in an isolated copy, to preserve the user-managed dev server.

Local preview: http://192.168.1.176:3003/ . Not committed or pushed; awaiting visual review.
