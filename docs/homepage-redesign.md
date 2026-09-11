# Homepage redesign — local verification

> Release update: Contact us and FAQ questions are now public features using `POST /api/contact`. The old development-only/fallback descriptions below document the original prototype and are superseded by [the release guide](./vercel-release.md). Account and other experiments remain local-only.

The redesigned page is **`/`**, accessible at `http://192.168.1.176:3003/`. This change was explicitly approved for the main homepage; it is not restricted to `/home-preview`. No commit, push, deployment or server restart is part of this work.

## Content order

1. Hero with the existing coastal image, concise solar/storage copy and two actions: **Get Your Free Assessment** → `/consultation`, **Get an Estimate** → `#calculator`.
2. Reusable Antigua calculator, labeled for **Antigua / APUA June 2026**, with the existing bill-only slider and unchanged calculation model. Its orange **Get Your Free Assessment** button links directly to `/consultation`, not Contact us.
3. Reusable `WhyChooseUs` at the unchanged `#benefits` anchor. Left: four reasons covering economical/fuel-free solar and backup, UL equipment/warranties/monitoring/support, Antigua-based stock and services, and professional 150+ MPH-rated design. Right: a 2×2 grid of animated statistics, inspired by [AGM Solar's why-us section](https://agmsolar.com.do/). Cards count once on entry, lift on hover and use top gradient accents; reduced-motion and no-JS users see final values without motion.
4. Independent `SolarInstallation` module at `#solar-installation`: initial satellite-data-based proposal within 48 hours, engineer visit and complete plan around 2–4 days after the customer's agreement, professional installation typically 1–2 days after approval of the final plan, then “Watch Your Bill Drop.” The timing is user-supplied planning copy, with a short access/scheduling qualification. Its CTA retains `/consultation`.
5. **Contact us / Let’s talk about your next step.** The four homepage eyebrow labels (calculator, why-us, installation, contact) are removed; section headings remain.
6. Simplified footer with working section and assessment links.

Removed: **Service Areas Across the Caribbean**, the duplicate bottom assessment banner, and unsupported uptime/storm-proof/performance claims. No invented performance statistics replace them.

The Hero support labels reflect the user's supplied scope: **150+ MPH Rated**, **Local Parts Stock**, **10-Year Inverter + Battery Warranty**, and **25-Year Solar Panel Warranty**. These are supplied marketing statements, not independently verified certification or warranty documentation. The FAQ separately describes available cleaning and reinforcement services without promising free services or mentioning pricing.

## Implementation boundaries

- Content-area “Get Your Free Assessment” links use the shared `AssessmentLink` component: orange `#fea619`, dark text `#422600`, lighter-orange hover and the same `/consultation` destination. Hero, calculator, installation, FAQ assessment answer and the non-development Contact us fallback reuse it. Header and footer keep their teal CTAs; message-submit buttons are unchanged.
- Why-us statistics are presentation copy, not live records or calculator outputs: `100+` is explicitly labeled an illustrative installation count that must be replaced with verified data before publication; `95%` is qualified as potential savings (up to), and `5` years is a target for suitable configurations, not a guaranteed maximum. The existing calculator's 80% assumption and pricing/payback formulas are unchanged. The 10-year metric refers to inverter/battery coverage, with the separate 25-year solar panel warranty also stated. Cleaning/reinforcement is available, with no free-service claim. Edit reasons and figures in `components/why-choose-us.tsx`.
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
