# Caribbean homepage — local review

## Mobile hero — lower actions and two buttons, published 2026-10-13

At the user’s request, up to 700px hide See how it works and group the Solortide introduction with two full-width actions below the main headline. In the latest spacing refinement, keep the title close to its previous position with clamp(100px, 23svh, 194px) top padding, while placing the lower group 24px above the hero footer rule (20px on short screens). Use space-between to give the extra room to the image area between the title and introduction. Screens up to 700px high retain 96px top padding and a smaller minimum gap. Keep the original three-line headline. Follow the regional hero’s viewport approach: min(844px, 100svh), natural content growth and a safe-area inset below the footer.

The latest refinement puts an orange Get a Free Consultation button above the outlined Explore your country button, with a 12px gap. Both mobile actions are text-only; the Explore arrow is hidden on mobile. The consultation button reuses the existing assessment region chooser and leads directly to the selected region’s consultation form. The headline moves upward from the single-button centered version. The additional action is hidden above 700px; desktop layout and actions, including its Explore arrow, remain unchanged.

Restore the original horizontal rule and left/right Rooted in island life / country-name footer row on mobile as explicitly requested. The flex layout reserves its height within the hero rather than adding another row beyond the screen. Preserve the original hero asset/crop and existing copy; Explore your country still targets #countries. Only the homepage component and its stylesheet changed.

Preview and before/after screenshots: `design/caribbean-mobile-hero-20261012/`. The latest version is in `button-lowered/`; the other folders retain preceding iterations for comparison. This refinement was published as `dpl_Nm2GuE6EMkgLhcRq84YsZxgT5S2S` on 2026-10-13, together with the regional Contact us and installation-copy updates. The published regional benefits module is preserved. Live evidence: `design/home-contact-all-release-20261013/`.


## Service-process image labels — 2026-10-12

Published as `dpl_B1QEkHcJw3WqKoGwbkmD9Q5RdSmq`. At the user’s request, removed “Illustrative imagery” from the desktop process image and all five mobile images, plus the unused label styles. Candidate/live checks and screenshots passed at 1440, 390 and 320px. Image provenance remains documented in the earlier design notes; the existing illustration alt text is retained.

## Landing hero copy — 2026-10-12

Published as `dpl_EFAEBULFG7yid9Uv5eHu8Eoxw3rB`. Removed the title eyebrow, “Designed around your home.” and “Currently serving”. Hero bottom now retains only “Rooted in island life.” on the left and “Antigua & Barbuda · Dominica” on the right. Candidate/live checks and screenshots passed at 1440, 390 and 320px; release evidence is in the chat’s `hero-copy-simplification` artifact folder.

## Desktop and closing country entries — 2026-10-12

Published to `https://www.solortide.com` as `dpl_2mb1XHsznZUN7wzdBXEgBbQRv4yJ`.

- At the user's request, planned locations now start collapsed on desktop as well as mobile. The “More islands” disclosure retains its plus/minus state indicator; expanding it shows all 16 gray flags and abbreviations together in one card. Clicking a flag still opens the existing wishlist with that location selected.
- Active country cards contain only flags and country names. Removed “Now serving…”, “Explore your island”, the planned-location heading/explanation, the redundant general wishlist entry, and all decorative arrows from this section. The closing “Let’s find your local solution.” country links also retain only flags and names.
- Kept the established palette, country destinations and wishlist behavior. Desktop cards and section spacing are more compact; mobile continues to fit its expanded location section below the fixed header in a single screen at 390×844 and 320×568.
- TypeScript and targeted lint passed. Actual screenshots and browser checks passed at 1440, 768, 390 and 320px. Wishlist interaction checks passed consecutively in rounds 1, 2 and 3 at 1440, 390 and 320px, covering keyboard disclosure, location preselection, focus return, validation, duplicate prevention, failure/retry, drafts and receipt recovery. Submissions were mocked.
- Offline review: `exports/solortide-homepage-review-v8-20261012.zip` contains twelve before/after comparisons across four widths and three states, plus the scoped code differences. Unzip and open `index.html`.

## Published — 2026-10-12

The completed refinements below are now live at `https://www.solortide.com`, included in full website deployment `dpl_29xmv32aDwG19JkTdggGNVFsa957`. Live browser checks passed at 390px, 320px and 1440px, including gray-flag wishlist entry, responsive benefits and the mobile footer. See `docs/vercel-release.md` for release checks and recovery details.

## Gray mobile flags and direct wishlist entry — 2026-10-12

- The 16 planned-location flags now use grayscale with 70% opacity inside the shared mobile card. Available-country flags retain their colors.
- Tapping a flag uses the existing wishlist dialog and preselects that location. Verified direct taps on all 16 flag images at both 390px and 320px, including closing the dialog and returning focus to the same location. No real submissions were sent. Targeted whitespace checks passed.
- `exports/solortide-homepage-review-v7-20261012.zip` includes the gray-flag comparison and screenshots of the wishlist opened from Barbados. This is an offline screenshot review; its image contents are not interactive.

## One shared flag card on mobile — 2026-10-12

- The expanded mobile list now places all 16 flags in one gray container, with four columns and short labels underneath. Individual options have no border or background. Labels use the existing two-letter location keys, with `SAB` and `BON` for Saba and Bonaire; the original wishlist codes are unchanged.
- Full location names remain in accessible button labels and hover titles. Desktop continues showing full names. The mobile section remains collapsed by default; expanded heights are 482px at 390px and 478px at 320px, fitting below the fixed header at 390×844 and 320×568.
- Each flag keeps a touch area at least 44px wide and 52px high. TypeScript and targeted ESLint passed; browser checks cover flag layout, abbreviations, collapse, modal preselection for Saba/Bonaire/St Kitts and Nevis, and focus return. No real submissions were sent.
- Downloadable before/after screenshots are in `exports/solortide-homepage-review-v6-20261012.zip`.

## Flags in the mobile disclosure — 2026-10-12

- Updated the expanded mobile list from text-only options to two columns of small flags with full location names. Flags are 20×15px and retain their colors for recognition; gray backgrounds and text continue distinguishing planned locations from available service.
- The section stays collapsed by default. Its default height remains 230px at 390px and 226px at 320px. Expanded heights are 633px and 634px respectively; short screens scroll normally. Every option retains a minimum 44px touch target.
- Targeted browser checks passed at 390px, 320px and 1440px: all 16 flags and names render, there is no horizontal overflow, collapse works, and a location still opens its preselected wishlist dialog with focus restored on close. No real submission was sent. Whitespace checks passed.
- Offline comparisons are in `exports/solortide-homepage-review-v5-20261012.zip`; unzip and open `index.html`.

## Mobile planned-location disclosure — 2026-10-12

- The user replaced the full mobile grid with a collapsed presentation: show Antigua & Barbuda and Dominica first, followed by a single “More islands” button. This supersedes the previous requirement to show all 18 options immediately on mobile.
- Expanding shows the 16 planned locations as smaller gray text buttons, without repeated flags. The button exposes its state through `aria-expanded` and `aria-controls`; collapsed options are removed from keyboard navigation. A planned location still opens its preselected wishlist dialog.
- Default section height is 230px at 390px / 375px and 226px at 320px. Expanded content may scroll normally on short screens. Desktop continues showing all planned locations directly, including when resizing from a collapsed mobile view.
- TypeScript and lint passed (four existing lint warnings). The existing wishlist browser check passed at 1440px, 390px and 320px, including keyboard expansion, collapse, location preselection, focus return, retry and receipt recovery. All submissions were mocked.
- Screenshots of the default and expanded states, full mobile viewports and this round's code differences are packaged in `exports/solortide-homepage-review-v4-20261012.zip`. No deployment was performed.

## Mobile simplification — 2026-10-12

- User direction: mobile location selection keeps only the title and location options. All 18 locations (2 available and 16 planned) use a compact three-column grid. Planned options have gray backgrounds and grayscale flags; clicking one still opens its preselected wishlist dialog. The mobile introduction, card descriptions, planned-area explanation and separate wishlist entry are hidden. Desktop retains its existing presentation.
- The location section is 544px high at 390×844 and 375×667, and 469px at 360×640 and 320×568. All options fit within those viewports below the 73px fixed header, without horizontal overflow. Text remains free to grow when zoomed.
- Removed the visible concept-image note at the user's explicit request, superseding the earlier decision to retain it. The content continues to describe solar use scenarios; image provenance remains documented below.
- The shared footer hides its “Scan QR code” button at widths up to 700px. Its WhatsApp link and regional contacts remain available, and desktop retains the inline QR image.
- TypeScript passed; lint passed with four existing warnings. Browser checks passed for four mobile sizes, the desktop footer and the Antigua mobile footer. The existing wishlist check passed at 1440px, 390px and 320px using the location button as the mobile entry; all submissions were mocked.
- Offline before/after screenshots and this round's code differences are in `exports/solortide-homepage-review-v3-20261012.zip`. Unzip and open `index.html`. No deployment was performed.

## Strategic locations and mobile benefits — 2026-10-12

- **Design intent:** help Caribbean homeowners see where service is available and planned, then understand the main solar/storage benefits without a long mobile scroll. Keep the existing cream, teal and amber palette, local flags and brand typefaces.
- **User direction:** show all 16 planned locations in “Choose your island” to communicate the business's regional strategy. Keep the wishlist but place its form in a modal. Existing Antigua & Barbuda and Dominica links remain distinct from planned service.
- Planned locations reuse `UPCOMING_ISLANDS`; full names remain visible in a four-column desktop / two-column mobile list. Clicking a location opens the wishlist with that location selected; the general wishlist entry supports other islands. The shared installation-country chooser is unchanged.
- The inline expansion form and its promotional paragraph are removed. The modal reuses the existing submission endpoint, fields and recovery messages. Its header and submit action remain visible while fields scroll on short screens. Escape, close and backdrop return focus to the trigger. Unsent fields survive closing/reopening. Confirmed named-location receipts survive a refresh in the same tab; only location codes are stored, never email addresses or custom location text. API behavior is unchanged.
- On mobile (up to 700px), the benefits section uses one compact picture and explanation with three explicit selections: Savings, Backup and Clean energy. It is manual, supports swipe, and maintains a stable height when changing selections. Desktop keeps its existing large carousel and autoplay behavior.
- Technical operating modes and equipment/tariff limitations remain available through “System controls & limits” on mobile; desktop shows them directly. Backup runtime qualifications and the image-provenance note remain visible in the compact presentation.
- Motion: 180ms location hover/press feedback, 240ms dialog/receipt entry, and a 220ms sliding selection indicator. The existing reduced-motion override disables these transitions. No new scroll animation or animation dependency was added for this scoped refinement.
- Default benefits height: 652px at 390×844, 582px at 375×667 and 665px at 320×740. The expanded technical explanation may grow naturally. The measured mobile defaults fit below the header; text zoom is allowed to increase height rather than clip content.
- The wishlist's steps remain location → email → submit with no page change. The location list is now visible without opening a select menu; clicking a named location preselects it. This trades an extra modal open for removing the inline form from the homepage.
- Removed copy: the two generic country-card taglines, the inline expansion slogan/paragraph, the redundant success thank-you, and the longer mobile scenario paragraphs. Retained: names, availability status, form labels, error messages and necessary qualifications.
- Evidence and the downloadable offline review will be saved in the task's `homepage-islands-mobile` artifact folder and `exports/solortide-homepage-review-v2-20261012.zip`.

### Verification for this refinement

- TypeScript passed. Lint passed with four existing warnings outside this change; targeted whitespace/diff checks passed.
- `island-wishlist.browser.cjs`: rounds 1, 2 and 3 passed at 1440px, 390px and 320px. Covers all 16 entries, preselection, native modal focus and return, validation, duplicate prevention, failure recovery, retained unsent fields and confirmed-location receipt recovery after refresh. All submissions were mocked; no real requests or emails were sent.
- `caribbean-carousel.browser.cjs`: rounds 1, 2 and 3 passed. Desktop autoplay/hover/manual advance/reduced motion, plus compact stable mobile layout, manual selection, touch swipe and disclosure at 390×844, 375×667 and 320×740.
- `caribbean-home.browser.cjs`: rounds 1, 2 and 3 passed at 390px and 1440px for the main navigation, region routing, five-step story, carousel, FAQ and assessment entries. Existing selectors now distinguish header Savings from the new benefit selector and reflect mobile copy.
- One independent review passed with no required product corrections. Additional 320×450/480 modal checks confirmed scrollable fields and a visible submit action. Fixed-header artifacts in element screenshots were addressed by hiding only fixed navigation/developer overlays during local section capture; full-page/modal evidence retains context.
- The shared country chooser, header, planned-region data, submission API and hero content match the pre-refinement baseline. No build, deployment, commit or push was performed.

## Previous confirmed refinement — 2026-10-12

- **User confirmed:** reduce the Cookie notice and shorten the service-process section; show solar/storage benefits before the process. Move the expansion signup below the FAQ.
- **User constraint:** keep the country chooser, including every forthcoming location, as requested by the business owner. Do not add customer/service evidence in this pass.
- **Pending user clarification:** keep the hero headline, hero image crop and main actions. The user asked which carousel was reviewed; preserve its interaction while identifying the `#hybrid-system` section for them.
- **Copy cleanup:** remove non-hero decorative eyebrows, repeated process labels/takeaways and the component tags that repeat the system description. Keep step numbers, field labels, errors, equipment/tariff limitations and image provenance disclosures. The user's request is to make the main information stand out.
- Current order: hero → country links → solar/storage benefits → service process → FAQ → expansion signup → local-solution links.
- Each process step now has one action heading and one paragraph; the existing desktop image sequence and mobile images remain. No new animation was added.
- The shared Cookie notice uses shorter copy and a compact layout. Its preference-storage behavior is unchanged; the notice still explains that those choices do not control analytics/marketing. Details remain available in Manage preferences.

## Scope

- `/` is a neutral Caribbean entry page, not an Antigua alias.
- `/antigua` and `/dominica` retain their existing content and business flows.
- No database, form, authentication or deployment changes.
- Root metadata/canonical and sitemap now identify `/` separately. Regional home hreflang x-default points to `/`.
- Savings opens a country chooser and links directly to the corresponding `#calculator`; assessment goes to the selected country's consultation page.

## Trust and content

The expansion signup describes more Caribbean locations as forthcoming. The generic “The details behind a better decision” section remains removed pending verifiable supporting material. The carousel shows uses for solar at home, rather than customer success stories. “Explore all FAQs” opens the shared country chooser and continues to that region’s FAQ.

Five service steps explain each activity and its outcome in a single paragraph. The carousel shows application scenarios, not completed projects, reviews or quantified outcomes. The user requested removal of the visible concept-image note in the mobile simplification round; the image provenance is retained below. Replace with verified customer material only after obtaining permission.

The root hero reuses the existing local Caribbean solar image. Region-specific certification, tariff and warranty details remain in regional pages. No invented awards, partners, reviews or activity timestamps.

## Interaction

The root now renders the shared `SiteHeader` in Caribbean mode rather than maintaining a separate header. It also uses `SiteRegionProvider`'s existing country modal for location switching, Savings and assessment. The shared chooser accepts an optional intent; confirmation routes to the selected country's calculator or consultation without altering ordinary regional switching. No root email is displayed. The duplicate root modal and its CSS were removed.

Desktop: sticky image follows the five readable steps. Mobile: each step has its own image. The desktop scene carousel advances automatically and can be advanced by clicking or swiping; it pauses on hover and respects reduced motion. Mobile uses manual selection and a compact layout. Country and wishlist dialogs use native modal focus handling and Escape, plus page scroll lock. The shared Cookie UI saves preferences without controlling tracking services.

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

For the 2026-10-12 refinement:

- TypeScript check passed: `npx --no-install tsc --noEmit --incremental false`.
- `npm run lint` passed with five existing warnings; targeted `git diff --check` passed.
- Cookie browser checks passed three consecutive runs.
- Homepage navigation and interaction checks passed three consecutive runs at 390px and 1440px. A temporary copy of the existing browser script matches the current mobile Antigua button label and waits for DOM readiness plus the existing page-loading indicator, avoiding an intermittent full-resource load timeout. Application assertions remain intact; repository tests were not changed.
- Screenshots reviewed at 320px, 390px and 1440px, with an independent visual review. No horizontal overflow was found. The 390px Cookie notice is 204px tall (previously 362px); the process section is approximately 2506px tall (previously 3667px).
- Country chooser and header files match their pre-refinement hashes. The hero content is unchanged.

Review evidence and before/after comparison are in the task's local `homepage-polish` artifact folder. No production build, deployment, commit or push was performed for this refinement.
