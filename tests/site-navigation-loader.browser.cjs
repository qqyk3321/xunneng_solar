// Run against a built local site. External services are blocked; no submissions.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.LOADER_TEST_ORIGIN || 'http://127.0.0.1:3195';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: width === 1440 ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && /hydration|async info|suspense/i.test(message.text()))
          errors.push(message.text());
      });
      await context.route('https://**/*', route => route.abort());
      await context.route('**/_next/image?**', route => route.abort());
      const idle = () => page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      const regionDialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
      let releaseScripts;
      const scriptsGate = new Promise(resolve => { releaseScripts = resolve; });
      const slowScripts = async route => {
        await scriptsGate;
        await route.continue();
      };
      await page.route('**/_next/static/**/*.js', slowScripts);
      await page.goto(origin + '/antigua', { waitUntil: 'commit' });
      await page.waitForFunction(() => document.documentElement?.dataset.siteLoading === 'initial');
      await page.locator('[data-site-loader] svg').waitFor();
      releaseScripts();
      await page.waitForLoadState('domcontentloaded');
      await idle();
      await page.unroute('**/_next/static/**/*.js', slowScripts);
      assert.equal(await regionDialog.isVisible(), false, 'root opens directly without region selection');
      await page.locator('footer button[aria-label="Change installation location"]').click();
      await regionDialog.getByRole('button', { name: /Antigua/ }).click();
      assert.equal(page.url(), origin + '/antigua');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.siteLoading), undefined);
      await page.locator('footer button[aria-label="Change installation location"]').click();

      let release;
      const gate = new Promise(resolve => { release = resolve; });
      const slowDestination = async route => {
        if (new URL(route.request().url()).pathname === '/dominica' && route.request().headers().rsc === '1')
          await gate;
        await route.continue();
      };
      await page.route('**/dominica?**', slowDestination);
      await regionDialog.getByRole('button', { name: /Dominica/ }).click();
      await page.waitForFunction(() => document.documentElement.dataset.siteLoading === 'immediate');
      assert.equal(await regionDialog.isVisible(), false, 'choosing immediately closes the native modal');
      const loader = page.locator('[data-site-loader]');
      assert.equal(await loader.locator('svg').count(), 1, 'brand SVG is inline');
      assert.equal(await loader.locator('img').count(), 0, 'brand waits for no image request');
      assert.equal(await loader.evaluate(el => getComputedStyle(el).opacity), '1');
      await page.waitForTimeout(650);
      assert.equal(await loader.isVisible(), true, 'loader remains while the destination is pending');
      await loader.screenshot({ path: `/tmp/solortide-loader-${width}.png` });
      release();
      await page.waitForURL(`${origin}/dominica`);
      await idle();
      await page.unroute('**/dominica?**', slowDestination);
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.locator('footer a[href="/dominica/faq"]').click();
      await page.waitForURL(`${origin}/dominica/faq`);
      await idle();
      await page.locator('#faq-search').fill('battery');
      await page.goBack();
      await page.waitForURL(`${origin}/dominica`);
      await idle();
      await page.goBack();
      await page.waitForURL(origin + '/antigua');
      await idle();
      assert.equal(await regionDialog.isVisible(), false);
      await page.locator('footer button[aria-label="Change installation location"]').click();
      await regionDialog.getByRole('button', { name: /Dominica/ }).click();
      await page.waitForURL(`${origin}/dominica`);
      await idle();
      // Choosing the current country must not leave a loader waiting for a URL change.
      await page.locator('footer button[aria-label="Change installation location"]').click();
      await regionDialog.getByRole('button', { name: /Dominica/ }).click();
      assert.equal(await regionDialog.isVisible(), false);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.siteLoading), undefined);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: regional home, slow region switch, inline brand, FAQ, Back, repeat selection, same-country selection; no app errors`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
