# Vercel Web Analytics

Only enabled in Vercel Production (`VERCEL_ENV=production`). Local development and
Preview builds do not collect traffic. The dashboard must have Web Analytics
enabled; deploy the integration before expecting data.

Tracked paths: `/`, `/antigua`, `/dominica`, `/consultation`,
`/antigua/consultation`, `/dominica/consultation`, plus `/solar-analysis` **only
after server-side password/access-cookie validation**. All other paths are excluded,
including FAQ, privacy, submission results, archived tools and 404s.
New regions require an explicit allowlist update.

The solar lock screen, wrong passwords and expired/invalid access cookies do not
mount the solar Analytics component. Authorized first entry, refresh and returning
with a valid cookie use ordinary Vercel page views (not a paid custom event).
Changing calculation parameters does not count as navigation. The shared
beforeSend callback checks the currently rendered authorized marker on every
event, avoiding stale authorization after client-side navigation. The marker
contains no credential and is NOT an access-control mechanism; server validation
continues to protect all analysis content. Existing database access logs are separate.

Uses `@vercel/analytics/next` for initial page views and client-side navigation.
No manual page-view sender or custom click/form events. Query strings and fragments
are removed from event URLs. An excluded initial page does not inject the tracking
script; the `beforeSend` filter also blocks excluded events after navigating away
from a tracked page. Prefetching is not a page view.

The root layout remains a Server Component. Tracking is an independent, nonvisual
client component, not a wrapper around page content. Script/network failures do
not gate rendering, navigation or form actions. No application-level retry loop,
database migration, secret, or database client is added.

Cookie preferences, access cookies, solar access logs and privacy copy are
unchanged. The analytics client neither reads nor writes consent/auth cookies;
the existing server-side check decides whether to render solar analytics.
It is not a consent-management implementation or a legal-compliance assessment.

Unit tests: `npm test`. Browser checks use an intercepted analytics script and
intercepted test requests, never real provider collection. Production dashboard
collection still needs verification after deployment.

Validation: 185 tests passed, isolated production build passed, and browser checks
covered all six allowed paths, excluded direct/SPA entries, refresh/back-to-home,
URL redaction and a blocked analytics script. No test traffic was sent to Vercel.
Solar checks additionally passed wrong-password omission, correct-password first
entry, valid-cookie refresh/return, parameter-change omission, stale callback
rejection, expired-cookie omission and usable analysis with the script blocked.

```sh
PLAYWRIGHT_MODULE=/path/to/playwright ANALYTICS_TEST_ORIGIN=http://127.0.0.1:3197 \
  node tests/web-analytics.browser.cjs
```

For solar checks, start the isolated production build with a fixture
`SOLAR_ANALYSIS_PASSWORD`, then pass the same value as
`SOLAR_ANALYTICS_TEST_PASSWORD` to the browser test. Database logging requests are
intercepted too; no live database records are created.
