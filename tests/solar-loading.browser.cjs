// Run against a local build; visit logging and external requests are isolated.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { accessCookieValue, SOLAR_ACCESS_COOKIE } = require('../app/solar-analysis/access.ts');
const assert = require('node:assert/strict');
const origin = process.env.LOADER_TEST_ORIGIN || 'http://127.0.0.1:3017';

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.route('https://**/*', route => route.abort());
    await context.route('**/solar-analysis/visit', route => route.fulfill({ status: 204 }));
    await context.route('**/_vercel/**', route => route.fulfill({ status: 204 }));
    await context.addInitScript(() => {
      window.__loaderDurations = [];
      let start = null;
      function sample() {
        const el = document.querySelector('[data-site-loader]');
        const state = document.documentElement.dataset.siteLoading;
        const visible = el && getComputedStyle(el).display !== 'none' && Number(getComputedStyle(el).opacity) > .99;
        if (visible && state !== 'leaving' && start === null) start = performance.now();
        if (start !== null && (!state || state === 'leaving')) {
          window.__loaderDurations.push(performance.now() - start);
          start = null;
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const idle = () => page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
    const minimum = async label => {
      await idle();
      const duration = await page.evaluate(() => window.__loaderDurations.at(-1));
      assert.ok(duration >= 970, `${label}: visible for ${duration}ms (frame sampling tolerance)`);
    };
    await page.goto(origin + '/solar-analysis');
    await minimum('password screen');
    await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict' }]);
    await page.reload();
    await minimum('authorized refresh');
    await page.getByLabel('选择每日用电模型', { exact: true }).selectOption('night');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.siteLoading), undefined);
    await page.getByRole('link', { name: '返回首页', exact: true }).click();
    await page.waitForURL(origin + '/');
    await idle();
    await page.goBack();
    await page.waitForURL(origin + '/solar-analysis');
    await minimum('client history return');
    // The persisted-page path also covers browser BFCache restoration.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await minimum('BFCache restoration');
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/_next/static/**/*.js', async route => { await gate; await route.continue(); });
    await page.reload({ waitUntil: 'commit' });
    await page.locator('[data-site-loader]').waitFor();
    await page.waitForTimeout(1300);
    assert.equal(await page.locator('[data-site-loader]').isVisible(), true, 'slow load must not be hidden after one second');
    release();
    await minimum('slow script load');
    assert.deepEqual(errors, []);
    console.log('PASS solar minimum 1s: locked entry, authorized refresh, history return, BFCache, slow loading, parameter changes');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
