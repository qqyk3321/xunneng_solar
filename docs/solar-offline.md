# Independent solar PWA

## Routes and permissions

| Route | Purpose | Password / telemetry |
| --- | --- | --- |
| `/solar-analysis` | Online calculator; no PWA button or download link | Both web passwords; only audited mode writes our database log. Vercel Analytics remains enabled for both authorized modes. |
| `/pwa` | Download, update, clear and browser installation | Private password only, separate HttpOnly cookie scoped to `/pwa`; no audit or Analytics. Never cached as an offline document. |
| `/pwa/app` | Independent calculator and PDF reports | Initial server delivery requires the download cookie; the installed copy runs entirely from local resources, with no login UI, audit or Analytics. |

The server-only `SOLAR_PRIVATE_PASSWORD` and `SOLAR_ANALYSIS_PASSWORD` overrides
are optional. Existing audited cookies remain compatible. PWA delivery and web
access use distinct cookie names and domain-separated hashes: a web login is not
authorization to download. No plaintext password or auth cookie is stored in
the offline pack. This change needs no database migration.

## Installation

1. Navigate directly to `/pwa` online and enter the private download password.
2. Choose **启用离线使用** and wait for **离线资源完整**. Resources are downloaded
   from the deployed site's CDN into the browser's Cache Storage, not an installer file.
3. Choose **安装到桌面**. The browser owns the native confirmation dialog. If a
   custom prompt is unavailable, open **打开离线应用** and use the browser's
   Install / Add to Home Screen menu (Safari Share menu on iPhone/iPad).
4. Launch the new app/shortcut at `/pwa/app`. It remains usable online or offline,
   after removing login cookies or after the download-page login expires.
5. Updates and removal are explicit actions on `/pwa`, requiring a fresh download
   login if expired. Existing downloaded reports are never deleted by these actions.

The application has no per-launch password and cannot be remotely revoked once
downloaded. Use trusted devices only. Clearing browser site data or automatic
storage eviction can remove it; re-download online to recover. Calculator inputs
are not persisted by this feature. FAQ, email and consultation still need network.
The English-report pack stays below 5 MiB and supports common Latin customer
names such as José and Renée; Chinese/emoji names are rejected before PDF loading.

## Isolation and caching

- Worker `/pwa/sw.js`, scope `/pwa`; no root or new `/solar-analysis` worker.
- Only exact `/pwa/app` document navigations use a complete cache-first copy.
  Online responses never replace the installed copy with a login screen.
- The download page, its password form/action, permission endpoint, database
  tracker and Analytics SDK are not in the offline resource manifest. The root
  analytics gate only imports its SDK on tracked website routes.
- Prepare/update requests are accepted only from same-origin `/pwa` clients.
  The server revalidates download authorization before fetching and at commit.
  POST, API and RSC requests are not cached or queued for replay.
- `npm run build` runs `scripts/solar/build-offline-assets.mjs` in postbuild,
  collecting only shared layout, `/pwa/app`, calculator lazy modules, PDF worker,
  brand font, model table and icons. The calculator/report implementation is
  shared with the online page, not duplicated.
- Every resource is size/SHA-256 checked before atomic pack replacement. A failed
  or cancelled update retains the previous complete pack. One previous pack is
  kept for open tabs. Cache eviction is detected before reporting ready.
- Vercel's recognized appended webpack toolbar bootstrap is removed only after
  the entire original build prefix passes its size/hash check. Arbitrary changed
  bytes still fail. No toolbar is needed in the offline application.
- Cached React HTML is unmodified, avoiding hydration mismatch. Its optional
  Google font stylesheet is replaced with a local brand-font declaration by SW.

## Existing installations

Older installed shortcuts point at `/solar-analysis`. They do not automatically
become the independent `/pwa/app` installation. Open `/pwa`, authenticate and
download/install the new application. Only after the new download succeeds do we
unregister the exact legacy worker and remove `solortide-solar-offline-v1-*`
caches. A failed new download leaves legacy resources intact. The old shortcut
may then be removed manually; other site data and downloaded PDFs are untouched.

## Verification

Use an isolated production build when the development server is running:

```sh
VERCEL_ENV=production npm run build
VERCEL_ENV=production ./node_modules/.bin/next start -H 0.0.0.0 -p 3019
PLAYWRIGHT_MODULE=/path/to/playwright SOLAR_LOG_TEST_ORIGIN=http://localhost:3019 \
  node --conditions=react-server --import tsx tests/solar-offline.browser.cjs
```

The browser test enforces loopback and intercepts every audit/Analytics request.
It checks both web modes, rejected public-password PWA login, private-password
download, package contents, 320/390px installer layout, expired/removed cookies,
cleared HTTP/model caches, cold offline Chromium restart, charts, tutorial,
7-page A4 PDF preview/download, and isolation from the website. `npm test` covers
server-side private audit suppression, separated cookies, cache integrity,
cancellation, eviction and transactional updates. Native installation dialogs
and Safari/iOS still require device-specific manual verification.

Service workers require HTTPS or localhost. Development-mode downloads are
intentionally disabled to avoid caching hot-update bundles.
