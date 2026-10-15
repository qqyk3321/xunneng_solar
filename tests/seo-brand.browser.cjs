// Read-only responsive release checks. Tally is stubbed; no form is submitted.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname.endsWith('tally.so')) return route.fulfill({ contentType: 'text/html', body: '<p>Local Tally fixture — no submission</p>' });
        if (url.pathname.startsWith('/_vercel/insights/')) return route.fulfill({ contentType: 'application/javascript', body: '' });
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const idle = () => page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.goto(origin);
      await idle();
      assert.match(await page.title(), /^Solortide \| Sol & Tide Energy/);
      assert.ok(await page.getByText('Solortide by Sol & Tide Energy.', { exact: false }).first().isVisible());
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'homepage horizontal overflow');
      await page.screenshot({ path: `/tmp/solortide-brand-home-${width}.png` });
      if (width < 800) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('button', { name: 'Savings', exact: true }).click();
      const dialog = page.locator('dialog[open]');
      await dialog.waitFor();
      const options = dialog.locator('[aria-label="Installation location"] button');
      assert.equal(await options.count(), 2);
      assert.match(await options.first().innerText(), /Antigua/);
      assert.equal(await options.first().getAttribute('aria-pressed'), 'true');
      await options.nth(1).click();
      await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL(`${origin}/dominica#calculator`);
      await idle();
      assert.equal(await page.locator('#calculator').count(), 1);
      assert.match(await page.title(), /Dominica.*Solortide/);
      for (const region of ['antigua', 'dominica']) {
        await page.goto(`${origin}/${region}/faq`);
        await idle();
        assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://www.solortide.com/${region}/faq`);
        assert.doesNotMatch(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${region} FAQ horizontal overflow`);
        await page.goto(`${origin}/${region}/consultation`);
        await idle();
        assert.ok(await page.getByRole('heading', { name: /Start your assessment/ }).isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${region} consultation horizontal overflow`);
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: visible Solortide brand, country selection, calculator, both FAQ/consultation pages, no overflow or client errors.`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
