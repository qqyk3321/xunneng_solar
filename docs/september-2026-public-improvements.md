# Public website improvements — 23 September 2026

Initially developed locally; subsequently approved for publication after checks.

## Cookie preference persistence

The existing code already saved a versioned localStorage preference. A read-only
production check confirmed that `solortide.com` redirects to `www.solortide.com`.
The reported repeat popup cannot be attributed to a missing localStorage write
or a broken canonical redirect on that evidence alone.

- Keep the existing localStorage key and migrate old dismissal flags.
- Save each store independently; a blocked localStorage API no longer prevents
  the session fallback from being written.
- Add a first-party preference cookie with no user/tracking ID. It has a maximum
  400-day lifetime, renewed on visits; localStorage has no application expiry.
- Recover localStorage from the cookie when necessary. Share the preference
  cookie across the two official domain variants; use host-only cookies locally.
- Preserve footer editing, rejection, cross-tab synchronization and graceful
  handling of malformed or unavailable storage.
- This is still a preference UI, not an analytics/marketing consent enforcement
  implementation. The privacy page now accurately describes persistence.

No site can promise persistence if a browser clears/blocks all storage, in a new
browser profile, or in disposable private-browsing sessions.

## Currency

EC$/XCD is the model's accounting anchor. Existing country tariffs, equipment
selection, savings and payback assumptions are unchanged. USD remains the default
display as initially requested. Currency choice is not a location selector.

The slider resets to a default amount in the new currency instead of preserving
the previous user-selected amount. A short status asks the visitor to adjust it.
All visible monetary results use the chosen currency. Integer min/max bounds are
rounded inward to keep every selectable amount inside the supported model.

Fixed rates checked on 23 September 2026:

- 1 USD = 2.70 XCD: [ECCB](https://www.eccb-centralbank.org/history-of-the-ec-currency).
- 1 USD = 1.79 XCG: [CBCS](https://www.centralbank.cw/functions/banknotes-coins/caribbean-guilder/frequently-asked-questions).
- 1 EUR = 1.1463 USD, ECB reference dated **22 September 2026**, retrieved from
  [the ECB daily XML](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml).
  Thus 1 EUR = 3.09501 XCD. The linked daily feed will change; these saved numbers
  do not change unless edited in `lib/antigua-calculator/currency.ts`.

The tooltip supports mouse hover, keyboard focus/Escape and touch click. No live
rate API, fee simulation or user financial data collection was added.

## Image loading

The main and regional hero images already use optimized WebP sources and Next
Image. Keep their priority loading: delaying a first-screen hero would hurt the
experience. Below-fold process and carousel pictures now mount only when their
slots intersect the viewport. Desktop process layers load when selected; mobile
images keep their aspect ratio to avoid layout shift. The carousel's visible
side cards are allowed to load when that carousel is in view. No new raster art,
video, 3D framework or image-generation dependency is needed for the system demo.

## How it works

Routes: `/how-it-works`, `/antigua/how-it-works`, `/dominica/how-it-works`.
Shared header/footer links, page metadata and sitemap entries are included.
Country switching preserves this page type.

Native SVG equipment illustrations, blue DC/red AC lines, animated flow markers
and four states: daytime charging, night discharge, grid outage, grid support.
Outage shows isolation/no export and essential circuits, not unlimited whole-home
backup. No invented live power values or grid-export entitlement is shown.
Automatic scenes run every nine seconds; manual selection pauses the demo.
Animation stops offscreen, in background tabs and for reduced-motion preferences.
The conceptual information is based on the US Department of Energy's
[inverters guide](https://www.energy.gov/cmei/systems/solar-integration-inverters-and-grid-services-basics)
and [storage guide](https://www.energy.gov/cmei/systems/solar-integration-solar-energy-and-storage-basics).

Tests: `npm test`, isolated production build, and
`tests/september-improvements.browser.cjs` with `PREVIEW_TEST_ORIGIN` and
`PLAYWRIGHT_MODULE` pointing to the temporary test server and installed Playwright.
No enquiries, database records or external-service settings are changed by tests.
