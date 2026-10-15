# Homepage redesign — local verification

## Contact methods — two links left, QR right, 2026-10-13

User correction for the regional homepages and FAQ: group the support email and WhatsApp link into one left column, with the QR in the right column centered against both lines. Reuse WhatsAppContact's existing two-row child slot instead of placing the email above the entire WhatsApp/QR block. Keep a 16px gap between the two links and the existing 112px QR. Mobile still hides the whole inline contact group; form, popup, footer and destinations remain unchanged. Evidence: `design/contact-alignment-20261013/`.

## FAQ — mobile and shared Contact us, 2026-10-13

User-confirmed follow-up: make the FAQ's bottom contact area follow the regional homepage, then optimize mobile. Reuse the same Contact us component and approved team/24-hour copy at every width; desktop shows the regional email and WhatsApp QR directly, phones retain the form and floating popup without those extra details. Preserve #ask-question, draft/photo/consent behavior and regional destinations. The regional homepage contact rendering was checked against production and is unchanged.

Agent layout decisions: through 1000px, use FAQs, one search field and a native category selector, then the original white question cards with complete answers. Remove repeated introductory copy and same-page shortcuts. Keep 48px controls, 16px input/question text, naturally expanding answers and accessible labels. Place the expansion symbol at the left to stay clear of the contact launcher. Category changes stay in place; search behavior and desktop layout remain. At 390×844, about six full questions fit instead of one. Extend the FAQ's existing delayed popup loading to mobile and keep it visible at the contact section.

This supersedes the preceding desktop release's Still have a question? / 48-hour contact presentation and untouched-mobile restrictions. Scoped checks, mocked form submissions and one independent visual/touch review passed. Published as `dpl_4Njv1MDBu9HtprAadrCmnRKtqhzX`; candidate and canonical checks passed. Evidence: `design/faq-mobile-20261013/`; details: `docs/faq.md`; download: `exports/solortide-faq-mobile-20261013.zip`.

## FAQ — desktop cleanup, 2026-10-13

User-confirmed scope: optimize the regional FAQ on Web first, continuing the existing brand and content simplification direction. Agent implementation decisions: above 1000px, keep the original question cards and complete answers, one heading without a trailing period, search above answers, a sticky category column without repeated counts, and a single bottom question heading with the existing 48-hour email response. Keep useful scene/calculator/assessment links and the regional contact form; make its popup available from the desktop first screen.

Only when selecting a category after scrolling past search, bring its results beneath the header; selections at the top stay in place. At 1001–1280px keep the question list clear of the original floating launcher. Phone/tablet presentation and initial lazy loading remain unchanged; 390px before/after images match pixel for pixel. Details and verification: `docs/faq.md`, `design/faq-desktop-20261013/`. Published as `dpl_6xv3sM1C8KkfRtA8hQ3sTfxz2UAU`.

## How it works — mobile cleanup, 2026-10-13

User requested the mobile follow-up to the approved desktop guide. On phones through 760px, use How solar works, six 44px-minimum controls in three columns/two rows, the existing full diagram and four supply statuses in two columns. Remove the redundant opening/closing slogans and body navigation. Put the original complete scene explanation and diagram limitations behind the 44px information button in a bottom popover. Keep the existing scene data, animation, hash deep links and FAQ answers. Switching scenes stays in place.

Fit the diagram naturally to available height while retaining legibility: image width 250–340px, always limited by its container, original aspect ratio, no cropping or fixed page-height clipping. The two legend labels occupy two compact rows beside the information button. The diagram and statuses end at about 775px in a 390×780 viewport and 839px at 390×844; short/narrow screens scroll naturally. Give Common questions its own white surface and keep the bottom orange assessment action full-width within its card.

Extend the existing WhatsApp/QR/message popup launcher to phones, preserving country/Cookie exclusions. Tablet widths 761–1000 retain side-by-side diagram/text with the simplified copy; desktop above 1000 retains the preceding layout (1440px screen and full-page screenshots matched pixel for pixel). These specific editorial/layout details are Agent implementation decisions under the requested mobile optimization scope.

Published as `dpl_BHxXLekKkUhF2NvUVccbj4gtWNbm`. Scoped browser checks, independent visual review, production build and both-region live checks passed. Evidence/comparison: `design/how-it-works-mobile-20261013/`; download: `exports/solortide-how-it-works-mobile-20261013.zip`.

## How it works — desktop cleanup, 2026-10-13

User-confirmed scope: simplify redundant links and explanatory copy on the regional How it works desktop pages, preserving contact popups. At widths above 1000px, use the concise How your solar system works title, one row of six named scene controls without numbering, the existing diagram beside its explanation and equipment statuses, and Common questions above the four disclosures. Hide the redundant Back to home, Explore all FAQs and scene-return links in those disclosures, plus the opening and closing supporting slogans. Header/footer navigation and the page assessment action remain. These specific editorial and layout choices are Agent implementation decisions within the requested scope.

The original diagram, flow animation, scene data/limits, hash selection and FAQ answers remain. Move the diagram's supplementary note into an information popover beside the AC/DC legend. Restore the existing WhatsApp/QR/email-message popup through a deferred desktop launcher; suppress it while country selection or Cookie preferences is open. Reuse the existing contact functionality without modifying shared dialog behavior. Tablet/phone widths through 1000px keep their prior content and layout; 390px before/after screenshots match pixel for pixel.

Evidence and before/after comparison: `design/how-it-works-desktop-20261013/`. Targeted browser checks and one independent visual review passed. No real form submissions or emails.

## Phone estimate — four full-width result rows, 2026-10-13

User-confirmed update: on phones up to 640px, each of the four estimate metrics occupies its own full-width row. Give Estimated budget the strongest emphasis and increase the module's vertical presence. The budget uses a larger 56px figure and 140px area; Payback, Annual savings and Outage backup each follow on separate 84px rows, labels/help at the left and values at the right. Payback is 32px and the other values 26px. Short/narrow screens use smaller figures and tighter natural rows while retaining the 44px explanation targets. This supersedes the previous side-by-side annual-savings/backup phone layout.

Keep Your solar estimate, compact inputs/kWh, live calculations, ~ prefixes/currencies/units, existing explanations, the full-width orange action and the pale-green section surface. The ordinary 390×844 module grows from about 557px to 697px; 320×568 remains about 506px and fits below the header. Widths above 640px retain their preceding layout and typography. Validation or enlarged text can grow naturally without clipping.

Published as `dpl_3tYpSjD6o1sMajEEeBxY7P65BKLV`. Scoped checks passed both regions at 320, 390, 640, 641 and 1440px, with all four supported currencies at their bounds on 320/390px, no value overlap, live updates and explanation opening/dismissal. Production build and quick canonical mobile checks passed. Evidence: `design/mobile-estimate-rows-20261013/`; screenshots: `exports/solortide-mobile-estimate-rows-20261013.zip`.

## Phone assessment buttons — equal full content width, 2026-10-13

User-confirmed correction: the calculator, benefits and installation orange actions must all fill their content column with equal left/right margins. Remove the 72px right-side reservation from the benefits and installation action containers on phones. Keep the 52px height, shared orange/font/corners and existing regional destinations. At 390px all three are 350px wide with 20px margins; at 320px they are 288px wide with 16px margins. Desktop and floating-contact behavior are unchanged. The earlier decision to shorten the last two actions has been rejected.

Published as `dpl_DSKCZ6ZhmnPptJzo7pbqkRfEhuki`. Both regions passed width/style checks at 320/390px and unchanged desktop geometry at 1440px, followed by the production build and quick live 390px checks. Evidence: `design/regional-full-width-cta-20261013/`.

## Phone calculator heading and matching assessment actions — 2026-10-13

User-confirmed follow-up, phones up to 640px only: restore a visible calculator heading, add an assessment action below the benefits content, and align the appearance of the regional page's assessment buttons. The phone heading is Your solar estimate, with the same 28px Space Grotesk / left alignment as the other section headings (24px on narrow/short screens). Desktop retains What could solar save you? and its existing presentation.

The benefits action uses AssessmentLink and follows the current country's consultation route. It is hidden above 640px. Hero, calculator, benefits and installation use matching orange #fea619, dark #422600, 14px/21px 600 Space Grotesk, 8px corners, 52px height and 14px 20px padding on phones. Following the user’s width correction, benefits and installation also fill the entire content width, matching the calculator; do not reserve horizontal space for the floating contact launcher. No mobile arrows are added. Desktop, header/footer buttons, regional logic and form behavior remain unchanged.

Published as `dpl_BpsPM3A32c4kh3hmH9Eo9DSeAgyK`. Both regions passed scoped checks at 320, 390, 640, 641 and 1440px: heading, same computed button styles, consultation navigation, live estimate and no overflow/client errors. The default calculator is about 495px high at 320×568 and 557px at 390×844, fitting below the header. Validation errors/enlarged text retain natural flow. Build, canonical identity and quick live checks passed. Evidence: `design/regional-mobile-cta-20261013/`; screenshots: `exports/solortide-regional-mobile-cta-20261013.zip`.

## Mobile regional page — clear section boundaries, 2026-10-13

User-confirmed scope: the individual modules are already approved; refine the overall page on mobile only, so each module reads as a distinct section. Preserve the content, order, hero, calculator hierarchy and accordion/form behavior.

Agent implementation choices: at widths up to 640px, use solid alternating surfaces—pale green calculator, white benefits, pale green installation, white contact. Replace only the phone installation gradient with the calculator’s established green; define its top and bottom transitions with a fine inset rule. Share 32px vertical section padding, reduced to 24px on screens up to 640px high. This adds just 64px to the 390×844 page while keeping all approved internal spacing, typography and gutters. The calculator still fits one available phone screen. Wider layouts retain their previous computed geometry, surfaces and typography.

Published as `dpl_C7i9XJsTvVGvMrf2yib34nwuzWt6`. One independent screenshot review found no in-scope visual issues. Responsive/interaction checks passed for both regions at 320, 390, 640 and 641px; 1440px desktop baselines match. Production build/type checks and canonical 390px screenshot/layout comparison passed. Evidence and offline comparison: `design/regional-mobile-sections-20261013/`; downloadable package: `exports/solortide-regional-mobile-sections-20261013.zip`.

## Consistent mobile regional section headings — 2026-10-13

On phones up to 640px, Benefits, Solar Installation and Contact us share left alignment, 600-weight Space Grotesk at 28px/1.2, -0.7px tracking and dark #183c43. Titles use 24px on narrow or short screens. Match their horizontal starting point (20px gutters, 16px below 360px) and use 18px before the content, reduced to 14px on short screens. The wider phone containers share the same content width. Remove the trailing period from Solar you can count on; the other two main titles already have none. Card headings, complete descriptions and accordion behavior remain intact. Desktop typography/layout is unchanged.

Left alignment was used as the stated assumption after asking an optional preference question. Both regions passed visual/style checks at 320, 390, 640 and 1440px; the desktop measurements match the preceding release. Published as `dpl_GSkDYvsXNv97F7UprTi8jU2boEAz`; quick live checks passed for both regions at 390px. Evidence: `design/regional-section-headings-20261013/`.

## Direct region selection — 2026-10-13

The shared location dialog is a direct navigation choice on desktop and mobile. Opening it never preselects or ticks a country, including when opened from a regional page. Clicking Antigua or Dominica immediately closes the dialog and follows the existing destination for the entry point (regional home, savings, FAQ, process or consultation). Remove Save location/Continue and their extra confirmation step. Selecting the current country simply closes the dialog. The URL remains the source of the page's regional content; no stored or default country is applied.

Retain the existing country-card styling, flags, neutral border, keyboard focus, close/Escape behavior and gray planned islands. Hover/press uses the existing teal tint without becoming persistent selection. Preserve the existing assessment restart safeguard as a native confirmation if that route requests a country change. Production build and targeted routing checks passed. Desktop/mobile screenshots and live navigation evidence: `design/region-direct-20261013/`. Published as `dpl_DGYANEUAe1SwxZVzpGkbmAvPUTVp`.

## Mobile installation timeline — full copy, published 2026-10-13

Phones up to 640px use the original numbered-circle timeline as an accordion, with only the first description initially expanded and at most one item open. Per the user's latest correction, preserve the complete original descriptions and the regional heading on mobile. Both layouts read the same localized step data; there is no shortened mobile copy.

Use natural document flow: expanding a step moves later cards and actions down, collapsing moves them up. Remove the previous viewport-based minimum height, distributed flex spacing and bottom-pinned action. Keep compact readable spacing; longer content and smaller screens may scroll naturally. There is no clipping, inner scrolling or forced viewport fit. Preserve the mobile assessment row's separation from the floating contact launcher and all regional destinations. The 641px+ layout remains unchanged.

Scoped ESLint, TypeScript and diff checks passed. The targeted check covers three consecutive rounds across both regions and seven viewport sizes: complete mobile/desktop copy parity, regional heading, initial/exclusive open state, keyboard, natural module and sibling movement, unclipped content, stable scroll and real assessment navigation. No forms were submitted. Latest evidence: `design/installation-mobile-20261013/full-copy/`; the older `after/` images retain the superseded shortened-copy draft. Download: `exports/solortide-installation-full-copy-preview-20261013.zip`. Published as `dpl_XJ7uqwQq3PiNyr6UxpHPWUM9Wnqn`. The user requested a direct release without repeating the prior test matrix: reused the existing results, ran the production build and a quick canonical check for both regions. Live screenshots and quick-check evidence: `design/installation-mobile-20261013/live/`.

## Regional Contact us — compact copy and direct QR, published 2026-10-13

Preserve the existing pale background, two-column desktop layout, typography and white form card. Keep Contact us as the single heading; remove the duplicate next-step slogan, photo/message explanation, mail icon and A real reply, by email label. Show the regional support address directly on desktop. The shared desktop/mobile copy explains that the solar team will understand the visitor’s needs, answer questions and explain options clearly. Per the user’s latest instruction, the contact introduction and its success receipt state a reply within 24 hours. FAQ and floating-question copy retain their existing behavior and wording.

Display the WhatsApp QR directly on desktop, alongside the chat link. Following the user’s mobile refinement, up to 640px show the full team introduction and response time, while hiding this section’s support-email and inline WhatsApp/QR entries. Keep the floating contact launcher visible while Contact us is in view on phones, including popup opening, Escape/focus recovery and Prefer email returning to the form. The FAQ and desktop launchers still hide at their forms; Cookie, region-dialog and mobile-calculator exclusions remain unchanged. Keep the compact padding and photo/submit buttons on one line at narrow widths. The shared WhatsApp component keeps its default behavior elsewhere, including the previously approved footer. The empty character counter is hidden until 500 characters remain; validation, consent, image upload and retry logic are unchanged.

At 1440px the contact section reduces from about 744px to 591px; at 390px from 1115px to about 714px after restoring the full introduction. The 320px version remains scrollable with readable fields and consent text. Preview and before/after evidence are in `design/contact-us-review-20261013/`. Published as `dpl_Nm2GuE6EMkgLhcRq84YsZxgT5S2S` after candidate and live browser checks. The same release removes the requested installation-introduction sentence on both regional homepages. Live evidence: `design/home-contact-all-release-20261013/`. The mobile follow-up was published as `dpl_EhmTykxX9KzYccQnQv9owgqVCoED`; current screenshots and checks are in `design/contact-mobile-refine-20261013/`. Pure main-site changes do not require a staff release record.

## Regional benefits — approved desktop and mobile, 2026-10-12

User confirmed the compact benefits module and authorized release. Desktop follows the repeatedly reviewed B preview in `design/regional-benefits-original-ui-options-20261012/`: preserve the two-line regional heading, original two-column composition, three white reason cards, typography, rounded corners and gradient card accents. Use a short heading and one sentence per reason. Retain Antigua's UL certification and local stock/support, and Dominica's CE certification and local service coordination.

At all widths show four equal statistics cards in a 2×2 grid: 100+ / Systems installed, ~95% / Bill savings potential, <5 years / Payback period, and ≤24h / Response time. Center the number and label together vertically. Keep payback orange and other numbers teal, with a smaller inline years unit. The user explicitly removed all prefixes above numbers, notes and the bottom disclaimer, and added the response-time card. These are user-approved presentation claims, not values computed by the calculator or live installation records; the 100+ count has not been independently verified.

At widths up to 800px, use the approved preview in `design/regional-benefits-mobile-preview-20261012/`: show only Solar you can count on as the heading, then the four statistics and three compact reason cards. Following the 2026-10-13 update, the first reason (Lower bills. Smarter backup.) is expanded by default; the other two show a short title with a plus sign. A native details/summary group opens one reason at a time with a minus sign, supports keyboard activation and does not navigate or force scrolling. Full service details remain available on demand. Hide the separate desktop reasons on mobile and the mobile disclosures on desktop.

The fully collapsed phone content fits below the header at 320×568 and 390×844; the default-open first reason adds its natural content height. Use white for benefits beside the calculator's pale green; benefits padding belongs to its own component. Short screens reduce spacing, with natural height when details expand or text grows. Preserve fonts, hero, calculator, installation section and existing animation/reduced-motion behavior. Browser coverage: `tests/regional-benefits.browser.cjs`.

## Regional calculator — results first on mobile, 2026-10-13

On screens up to 800px, display inputs and results together with live updates. Remove the See my estimate / Edit bill actions, duplicate monthly-bill result header and input/results view state. The user emphasized that results must dominate: use a small two-row bill/currency/slider/kWh control area, a full-width Estimated budget with the largest number, a separate prominent Payback row, and smaller Annual savings / Outage backup side by side. The assessment action stays below the results. Changing an amount does not navigate, switch panels or scroll; valid Enter closes the keyboard, while invalid input retains its error and makes results unavailable. Keep Monthly usage as an accessible label. Desktop retains the existing side-by-side layout.

The complete mobile module measures about 486px at 390×844, 444px at 390×568 and 437px at 320×568, fitting below the regional header. Allow natural scrolling with enlarged text or an open keyboard; never clip the module to a fixed screen height. Mobile hides range endpoint labels and uses the shorter Monthly bill label.

The input combines the editable monthly electricity bill, currency selector and range slider. Show estimated monthly usage in kWh underneath, using the existing regional tariff model. Results contain only Estimated budget, Payback, Annual savings and Outage backup, in that order. Prefix all four with `~`. Budget and payback receive larger teal values; annual savings and backup use smaller dark values. Keep currency and units visible. Preserve the current calculation, tariff assumptions and currency reset behavior.

Move electricity-bill guidance, FX/reference sources and estimate assumptions into accessible information popovers: click/tap on all devices, hover on desktop, Escape/close-button focus return and outside-click dismissal. Budget remains a planning amount derived from annual savings × assumed payback, not an equipment/installation quote; disclose that in its popover. The assessment action links to the currently selected region's consultation page.

On screens up to 800px, give the calculator a pale green `#e5eee9` background and an inset 1px `#bbd0c8` bottom divider. The immediately following benefits section uses white with component-owned responsive top padding, making the transition clear without increasing calculator height or introducing another heading. Desktop keeps its original surfaces and spacing.

While the calculator is visible on mobile, hide the floating WhatsApp launcher so it cannot cover controls; restore it after scrolling away. Keep the existing hero, header and background assets intact. The calculator's scroll margin follows the actual regional header height. Reduced-motion settings disable the view and popover animations. Browser coverage: `tests/calculator-compact.browser.cjs`; hero regression: `tests/regional-mobile-hero.browser.cjs`.

Published as `dpl_HkWBcHNmnJVeuZPjaJkNmWSWYYAB`. The final result-focused layout passed the existing calculator browser check once across both regions and six viewports, including currency extremes, live values, error recovery, help, fit and consultation routing. Production build and quick live checks passed. Evidence: `design/calculator-single-screen-20261013/results-first/` and `live/`. The earlier `local/` draft emphasized the input too much and was never promoted to the canonical domain.

## Regional mobile hero — approved A+B, 2026-10-12

At phone widths up to 700px, use the approved merged composition from `design/regional-mobile-merged-20261012/`: region/brand name above a clear map, full clean-energy headline below it, equipment/service facts, then two full-width stacked actions. Hide only the supporting paragraph on phones. Retain the original artwork, Antigua left alignment, Dominica right alignment, Solortide keyword and yellow fact separators.

Fit ordinary portrait phones in one available viewport, capped at 844px; the calculator section immediately follows the hero. Scale the original background to the available height on shorter screens so the country name and headline do not cover the map. Leave 28–40px between headline and facts, 20px before actions, 12px between buttons and 24px plus the safe-area inset at the bottom. Keep both actions at least 52px high and preserve estimate/calculator navigation. The header becomes shorter on short regional-home screens while retaining its 44px menu target and existing country selector. Content remains in normal flex flow so enlarged text can grow instead of being clipped.

This mobile choice supersedes the earlier phone typography and scrolling rules below. Tablet/desktop copy, ordering, typography and layout remain unchanged. Browser coverage: `tests/regional-mobile-hero.browser.cjs`.

## Shared mobile navigation — 2026-10-12

At widths up to 1000px, every `SiteHeader` uses the same circular menu toggle. Regional homepages, FAQ, How it works and customer submission pages show only the brand, country selector and menu toggle in the top row. FAQ and the assessment entry live inside the expanded menu; remove the old standalone mobile FAQ shortcut. The Caribbean homepage and privacy page retain their existing location-choice flow. The assessment form retains its separate progress header.

Use the reference regional-homepage header styling across these pages. Keep the toggle's 44px touch target; tighten logo size and gaps at 360px and below. The menu must scroll on short screens, preserve regional destinations and return focus to the toggle when dismissed with Escape. Desktop navigation and homepage reveal behavior remain unchanged. Browser coverage: `tests/site-header-mobile.browser.cjs`.

## Regional hero typography — option A, 2026-10-12

User-confirmed direction: option A (集中排布) from the two-region comparison. Treat each regional page independently. Keep Antigua aligned left and Dominica aligned right, retaining the existing background assets, overlays and mobile crops.

The user explicitly prioritizes the “Solortide” keyword for brand exposure. The heading pairs “Solortide” with the full country name, separated by a middle dot, above the prominent three-line clean-energy headline. Full supporting copy, assessment/estimate actions and all three equipment/service facts form a continuous group. Follow-up user adjustment: remove “Brighter homes. A cleaner tomorrow.” and the “Explore your savings” footer entry. Move the three equipment/service facts down 16px and place a yellow vertical separator between neighboring facts. Keep the phone facts in three compact columns so separators remain between items. Retain the existing brand fonts and button colors.

Desktop headline/country-heading sizes are 70px/38px; the mobile business headline stays 47px, while the brand/country heading scales from 21px to 31px to remain on one line. Content flows naturally with flexible lower spacing: 390×844 fits the full hero, while short narrow screens scroll rather than omit content or overlap it. This selection supersedes the restored hero's typography, while retaining its complete business copy and the user-confirmed content rule below. Only the hero is in scope.

## Regional hero restoration — 2026-10-12

The user rejected the simplified regional hero because it left too much empty space and asked for immediate restoration. At restoration, `/antigua` and `/dominica` used the exact pre-refinement hero component and stylesheet: the country title, upper slogan, clean-energy headline, full supporting copy, three equipment/service labels, filled estimate button and savings link are all restored. Treat the removed-content version as rejected, not as a design baseline.

User-confirmed evaluation rule: assess each regional homepage as an independent landing page for a visitor who may never have seen the main Caribbean homepage. Cross-page overlap or differences in messaging are not reasons to remove regional content. Judge clarity, information hierarchy, useful business content and responsive composition within the regional page itself. The current optimization scope remains the hero.

The separately requested removal of “Choose your country.” in the region dialog remains. Future regional improvements must preserve the central headline and content balance unless the user explicitly asks otherwise. See the release guide for the scoped restoration deployment.

Copy update: the first Why solar advantage now reads “Lower bills. Smarter backup. One connected system.” Its body qualifies solar/battery/grid/existing-generator coordination by compatible equipment and system design. The previous “No fuel” system-wide wording is removed; engineering details are in the FAQ.

> Release update: Contact us and FAQ questions are now public features using `POST /api/contact`. The old development-only/fallback descriptions below document the original prototype and are superseded by [the release guide](./vercel-release.md). Account and other experiments remain local-only.

The redesigned page is **`/`**, accessible at `http://192.168.1.176:3003/`. This change was explicitly approved for the main homepage; it is not restricted to `/home-preview`. No commit, push, deployment or server restart is part of this work.

## Content order

1. Hero with the existing coastal image, concise solar/storage copy and two actions: **Get Your Free Assessment** → `/consultation`, **Get an Estimate** → `#calculator`.
2. Reusable Antigua calculator, labeled for **Antigua / APUA June 2026**, with the existing bill-only slider and unchanged calculation model. Its orange **Get Your Free Assessment** button links directly to `/consultation`, not Contact us.
3. Reusable `WhyChooseUs` at the unchanged `#benefits` anchor. Left: three reasons covering solar and backup, equipment/monitoring/support, and local stock and services. Right: three animated statistics, with the final card spanning both columns, inspired by [AGM Solar's why-us section](https://agmsolar.com.do/). Numeric cards count once on entry, lift on hover and use top gradient accents; reduced-motion and no-JS users see final values without motion.
4. Independent `SolarInstallation` module at `#solar-installation`: initial satellite-data-based proposal within 48 hours, engineer visit and complete plan around 2–4 days after the customer's agreement, professional installation typically 1–2 days after approval of the final plan, then “Watch Your Bill Drop.” The timing is user-supplied planning copy, with a short access/scheduling qualification. Its CTA retains `/consultation`.
5. **Contact us / Let’s talk about your next step.** The four homepage eyebrow labels (calculator, why-us, installation, contact) are removed; section headings remain.
6. Simplified footer with working section and assessment links.

Removed: **Service Areas Across the Caribbean**, the duplicate bottom assessment banner, and unsupported uptime/storm-proof/performance claims. No invented performance statistics replace them.

The Hero labels retain equipment certification, local support and LiFePO4 battery type. Warranty, wind-resistance and battery-life marketing has been withdrawn, including the former qualitative replacements. The corresponding FAQ questions, search prompts and metadata references are removed. The FAQ separately describes cleaning and reinforcement services.

## Implementation boundaries

- Content-area “Get Your Free Assessment” links use the shared `AssessmentLink` component: orange `#fea619`, dark text `#422600`, lighter-orange hover and the same `/consultation` destination. Hero, calculator, installation, FAQ assessment answer and the non-development Contact us fallback reuse it. Header and footer keep their teal CTAs; message-submit buttons are unchanged.
- Why-us statistics are user-approved presentation copy, not live records or calculator outputs. The current four-card display and removal of explanatory notes follow the approved regional benefits rules above. The existing calculator's 80% assumption and pricing/payback formulas are unchanged. The former warranty/equipment-reliability card is removed. Cleaning/reinforcement is available, with no free-service claim. Edit reasons and figures in `components/why-choose-us.tsx`.
- Installation styling takes inspiration from the numbered circles, connecting line, cards and hover feedback in [Spice Isle Solar's installation section](https://spiceislesolar.com/), with original Antigua-specific copy and existing site colors/fonts. Four cards run horizontally above 900px and vertically on smaller screens. Cards reveal once on entry and respond on hover; reduced-motion settings disable animation. Content and CTA remain usable without JavaScript. No external animation dependency or copied assets are added.
- “How it works” has been removed from the shared header for now. Its future system-efficiency explainer page is not built yet; the old `#how-it-works` anchor remains removed. The navigation order is Savings, Why solar, Contact us, FAQ.
- `components/demo-homepage.tsx` remains the shared homepage renderer, preserving optional account/contact slots. `/` never supplies an account slot and does not read sessions.
- `/home-preview` still has its existing account integration; because it reuses this renderer, its body follows the new homepage layout. No auth handlers, middleware or session rules were changed.
- `components/demo-homepage.module.css` scopes the layout. No global styles, fonts, calculation configuration or consultation code were changed.
- `components/section-anchor.tsx` uses ordinary hash links as a fallback, with smooth scrolling when JS is available, reduced-motion support and focus transfer. Section scroll margins clear the fixed header. The calculator assessment button always links to `/consultation`; its previous configurable contact anchor is removed.
- The contact section is composed by `components/homepage-contact.tsx`. Development renders the existing `HomeContact` form; outside development it renders the same contact heading with an existing consultation link, not a form that would call a disabled API.

## Contact safety and release limitation

Supabase security review confirmed that the existing inquiry endpoint is development-only, uses an exact-origin guard and delegates Storage/database writes to server-only code. These controls are unchanged. No new table, bucket, policy, API key, public data access or live submission was introduced by the redesign.

**Contact us submissions are still a local-test feature.** `POST /home-preview/contact` remains disabled outside development. Enabling a live anonymous submission service needs a separate release decision. This implementation does not silently expose the test API just because the component now appears on `/`.

## Verification

```bash
node --conditions=react-server --import tsx --test tests/homepage-redesign.test.ts tests/antigua-calculator.test.ts tests/test-pages.test.ts tests/home-contact.test.ts tests/home-preview.test.ts
npx tsc --noEmit
PLAYWRIGHT_MODULE=/path/to/playwright node tests/homepage-redesign.browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/home-contact.browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/antigua-calculator.browser.cjs
```

Homepage browser checks cover section order, both hero actions, the orange calculator assessment link, header-to-contact scrolling, removed eyebrow labels, sticky-header clearance, reduced motion, calculator values, the rich-message modal and 320/375/768/960/1280px layouts. Contact tests use mocked responses by default and cover plain/rich messages, lost-receipt retry, image compression, resizing, preview and preserved drafts. **No real inquiries or images were saved and no emails were sent during this redesign's tests.**
