// First-frame regression: serve a production build and delay app JS, not HTML.
// No external services or database writes are used.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.LOADER_TEST_ORIGIN || 'http://127.0.0.1:3195';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('https://**/*', route => route.abort());
      await context.route('**/_next/image?**', route => route.abort());
      await context.addInitScript(() => {
        if (window.top !== window) return;
        window.__firstLoaderFrame = null;
        const sample = () => {
          const loader = document.querySelector('[data-site-loader]');
          if (!loader || !document.querySelector('[data-testid="home-hero"]')) {
            requestAnimationFrame(sample);
            return;
          }
          const style = getComputedStyle(loader);
          window.__firstLoaderFrame = {
            phase: document.documentElement.dataset.siteLoading,
            display: style.display,
            opacity: style.opacity,
            coversContent: !!document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('[data-site-loader]'),
          };
        };
        requestAnimationFrame(sample);
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && /hydration|async info|suspense/i.test(message.text()))
          errors.push(message.text());
      });
      for (const refresh of [false, true]) {
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        const holdScripts = async route => { await gate; await route.continue(); };
        await page.route('**/_next/static/**/*.js', holdScripts);
        if (refresh) await page.reload({ waitUntil: 'commit' });
        else await page.goto(origin, { waitUntil: 'commit' });
        await page.waitForFunction(() => window.__firstLoaderFrame !== null && window.__firstLoaderFrame !== undefined);
        const first = await page.evaluate(() => window.__firstLoaderFrame);
        assert.equal(first.phase, 'initial', 'brand covers the very first content frame');
        assert.equal(first.display, 'grid');
        assert.equal(first.opacity, '1', 'initial overlay must not fade in over visible content');
        assert.equal(first.coversContent, true);
        await page.waitForTimeout(450);
        assert.equal(await page.locator('[data-site-loader]').evaluate(el => getComputedStyle(el).opacity), '1');
        release();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
        await page.unroute('**/_next/static/**/*.js', holdScripts);
        await page.waitForTimeout(300);
        assert.equal(await page.locator('[data-site-loader]').isVisible(), false, 'loader does not return after content is ready');
        assert.equal(page.url(), origin + '/');
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: first content frame covered, slow JS, refresh, single reveal, no hydration errors`);
    }
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    await noJS.route('https://**/*', route => route.abort());
    await noJS.route('**/_next/image?**', route => route.abort());
    const page = await noJS.newPage();
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('[data-site-loader]').isVisible(), false);
    // This checks our overlay only. Next's existing streamed Suspense boundary
    // relies on inline scripts to reveal its HTML, separately from this loader.
    assert.equal(await page.locator('html').getAttribute('data-site-loading'), null);
    await noJS.close();
    console.log('PASS no-JavaScript: global overlay is not activated');

    const failedJS = await browser.newContext();
    await failedJS.route('https://**/*', route => route.abort());
    await failedJS.route('**/_next/image?**', route => route.abort());
    await failedJS.route('**/_next/static/**/*.js', route => route.abort());
    const failedPage = await failedJS.newPage();
    await failedPage.goto(origin, { waitUntil: 'domcontentloaded' });
    assert.equal(await failedPage.locator('[data-site-loader]').isVisible(), true);
    await failedPage.waitForFunction(() => !document.documentElement.dataset.siteLoading, undefined, { timeout: 25000 });
    assert.equal(await failedPage.locator('[data-site-loader]').isVisible(), false);
    assert.equal(await failedPage.getByRole('heading', { name: 'The Renewable Energy Solution for Antigua' }).isVisible(), true);
    await failedJS.close();
    console.log('PASS failed JavaScript: watchdog reveals server-rendered content instead of blocking forever');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
