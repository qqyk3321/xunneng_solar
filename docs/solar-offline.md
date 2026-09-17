# Solar analysis: local-first PWA

Only `/solar-analysis` gains offline support. There is no separate native app,
download site, background upload, service on the user's computer, or schema change.
The calculator and PDF code are shared with the online page.

## User flow

1. Open the page online and pass the existing server-side password check.
2. Choose **离线使用 → 启用离线使用**. Read the trusted-device notice.
3. Wait for **离线资源完整**. The initial pack is about 15 MB uncompressed,
   including the CJK report font, charts, PDF renderer/worker, tour, and models.
4. Optionally choose **安装到桌面**. Installation UI depends on the browser;
   a bookmark also works. Installing alone does not download the offline pack.
5. Reopen the same origin offline, adjust parameters and generate/download PDFs.
   FAQ, email, consultation and the rest of the site still require connectivity.
6. Update explicitly using **检查更新并重新下载**. **清除离线资源** removes
   only this tool's offline caches, registration and model localStorage entry,
   not downloaded customer PDFs or unrelated site data.

Do not enable on shared/untrusted devices. An offline copy is a remembered local
authorization, not a new online password check on every launch. No plaintext
password or auth token is placed in Cache Storage. Remote revocation cannot be
instant while offline. Opening the server's password screen online clears the
offline pack (including when the 12-hour cookie expires). Cache eviction also
requires a new online preparation. The calculator inputs themselves are not
persisted by this feature; a reopened page uses the existing defaults.

## Implementation boundaries

- SW is `/solar-analysis/sw.js`, with scope `/solar-analysis` (no root worker).
  Fetch handlers restrict document fallback to the exact analysis path; API,
  POST, RSC and all other page requests are network-only.
- Registration and pack download require an explicit action in the authorized
  component. The lock page cannot initiate preparation. The server rechecks the
  HttpOnly cookie before preparation and again before committing a pack.
- The authorized component attaches the manifest to `head` and removes it when
  leaving. This avoids Next's streamed body metadata (not recognized by Chromium
  for installation), and doesn't give other pages a PWA installation prompt.
- Authenticated `?offline-shell=1` HTML excludes visit logging and solar Analytics.
  It is served only as an offline document fallback, never cached by a CDN. Live
  server responses, including errors/lock pages, are never replaced with the pack.
- Cached HTML is unmodified to preserve React hydration. The optional external
  Google font stylesheet is replaced by a local Space Grotesk font declaration
  for a prepared solar client; other font families fall back to system fonts.
- `npm run build` runs `postbuild`, producing a versioned, SHA-256 resource list
  from Next's app and dynamic-import manifests. Only solar entry points and
  shared layout assets are included, not the entire site's JS or server bundles.
  PDF worker, font assets, icons and the model table are added explicitly.
- Generated PNG icons reuse `app/icon.svg`. The resource list and icons are build
  artifacts in `public/solar-analysis/` and are gitignored. The SW and web manifest
  are source-controlled. Public resources contain no credentials or customer data.
- Every resource is size/hash checked in a staging cache. Commit is atomic at the
  metadata pointer. Failure/cancellation keeps the previous complete version.
  One prior pack is retained for already-open tabs, then replaced on later updates.
- Vercel may append an opt-in toolbar bootstrap to `webpack-*.js` after postbuild.
  Only for this recognized suffix, the worker verifies the original prefix against
  its complete build-time SHA-256 and size, then caches ONLY that verified prefix.
  The toolbar is not part of the offline tool. Modified original bytes, arbitrary
  suffixes and changes to any other asset still fail validation.
- Browser Cache Storage stores program resources; existing localStorage model
  caching still works. Optional persistent-storage permission is best effort.
  Missing resources are checked before reporting ready or opening offline.
- Storage/download errors do not break normal online page requests. No API or
  analytics request is queued for replay. Offline PDF/customer data stay local.

## Local testing

Service workers require HTTPS or a loopback host such as `http://localhost`.
Plain HTTP at a LAN IP does **not** support them. The UI explains this restriction.
Development mode intentionally refuses to cache Next hot-update bundles.

Use a production build in a separate work directory if a dev server is running
(do not concurrently overwrite its `.next`):

```sh
npm run build
./node_modules/.bin/next start -H 0.0.0.0 -p 3017
```

Open `http://localhost:3017/solar-analysis` on that computer. For a remote
development host, forward port 3017 and open localhost on your own computer.
Never use a real deployment for the browser test below; it enforces loopback.

```sh
node --conditions=react-server --import tsx --test tests/solar-offline.test.ts
SOLAR_LOG_TEST_ORIGIN=http://localhost:3017 \
  PLAYWRIGHT_MODULE=/path/to/playwright \
  node --conditions=react-server --import tsx tests/solar-offline.browser.cjs
```

The browser test uses a temporary persistent profile, intercepts logging, clears
HTTP/model caches, restarts Chromium offline, then checks charts, parameters,
tutorial, a Chinese-named 7-page A4 report, scoped control and online revocation.
Unit tests cover authorization, partial/corrupt downloads, atomic replacement,
cache eviction, invalid manifests and unrelated-cache preservation.

Native installation dialogs and iOS/Safari behavior still need device testing;
Chromium's automated offline tests cannot prove every platform's install UX.
