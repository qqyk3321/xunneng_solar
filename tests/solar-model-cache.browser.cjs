const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { accessCookieValue, SOLAR_ACCESS_COOKIE } = require('../app/solar-analysis/access.ts');
const { MODEL_TABLE_STORAGE_KEY } = require('../lib/solar-analysis/model-table-cache.ts');
const manifest = require('../lib/solar-analysis/model-table-manifest.json');
const assert = require('node:assert/strict');
const origin = process.env.SOLAR_LOG_TEST_ORIGIN || 'http://127.0.0.1:3003';

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.route('**/solar-analysis/visit', r => r.fulfill({ status: 204 }));
    await context.route('**/_vercel/**', r => r.fulfill({ status: 204 }));
    await context.route('https://**/*', r => new URL(r.request().url()).origin === origin ? r.fallback() : r.abort());
    const page = await context.newPage(), errors = [], dataRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().includes('/solar-data/')) dataRequests.push(r.url()); });
    await page.goto(origin + '/solar-analysis');
    await page.locator('#solar-password').waitFor(); assert.equal(dataRequests.length, 0);
    const publicResponse = await context.request.get(origin + manifest.url);
    assert.equal(publicResponse.status(), 200);
    if (process.env.SOLAR_CACHE_PRODUCTION === '1') {
      assert.match(publicResponse.headers()['cache-control'], /public.*max-age=31536000.*immutable/);
    }
    await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict' }]);
    await page.reload(); await page.locator('#solar-step-hourly').waitFor();
    assert.equal(dataRequests.length, 1);
    const generation = await page.getByTestId('live-generation').innerText();
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), MODEL_TABLE_STORAGE_KEY);
    assert.equal(saved.version, manifest.version); assert.equal(JSON.parse(saved.text).models.length, 145);

    // Block every model request: reload still succeeds from persistent cache, not HTTP cache.
    await page.route('**/solar-data/**', route => route.abort());
    await page.reload(); await page.locator('#solar-step-hourly').waitFor();
    assert.equal(dataRequests.length, 1); assert.equal(await page.getByTestId('live-generation').innerText(), generation);
    await page.getByRole('button', { name: '朝向 东', exact: true }).click();
    assert.notEqual(await page.getByTestId('live-generation').innerText(), generation);
    assert.equal(dataRequests.length, 1);

    // A populated cache does not bypass the server-side password gate.
    await context.clearCookies(); await page.reload(); await page.locator('#solar-password').waitFor();
    assert.equal(await page.locator('#solar-step-config').count(), 0); assert.equal(dataRequests.length, 1);
    await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict' }]);
    await page.unroute('**/solar-data/**');

    for (const type of ['old-version', 'damaged-data']) {
      await page.evaluate(({ key, type }) => {
        const s = JSON.parse(localStorage.getItem(key));
        if (type === 'old-version') s.version = 'obsolete'; else s.text = s.text.slice(0, -1);
        localStorage.setItem(key, JSON.stringify(s)); localStorage.setItem('unrelated-test', 'keep');
      }, { key: MODEL_TABLE_STORAGE_KEY, type });
      const before = dataRequests.length;
      await page.reload(); await page.locator('#solar-step-hourly').waitFor();
      assert.equal(dataRequests.length, before + 1);
      assert.equal(await page.evaluate(() => localStorage.getItem('unrelated-test')), 'keep');
    }
    // LocalStorage can be unavailable (private mode/policy). Calculation still works.
    await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }));
    const before = dataRequests.length;
    await page.reload(); await page.locator('#solar-step-hourly').waitFor();
    assert.equal(dataRequests.length, before + 1); assert.equal(await page.getByTestId('live-generation').innerText(), generation);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(JSON.stringify({ ok: true, publicCdnAsset: true, passwordGatePreserved: true, noFetchBeforeUnlock: true, oneDownload: true, reloadFromLocalStorage: true, invalidation: true, corruptionRecovery: true, blockedStorageWorks: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
