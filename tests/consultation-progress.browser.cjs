// Uses a stub Tally iframe: no real submission, webhook or email is triggered.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [375, 1440]) {
      for (const [region, code] of [['antigua', 'ag'], ['dominica', 'dm']]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      page.setDefaultTimeout(15000);
      await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('Storage disabled for URL-region test'); }; });
      await page.route('https://**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === 'https://tally.so' && url.pathname.startsWith('/embed/')) {
          const formId = url.pathname.split('/').pop();
          return route.fulfill({ contentType: 'text/html', body: `<button id="finish">Simulate successful submission</button><script>document.querySelector('#finish').onclick=()=>parent.postMessage(JSON.stringify({event:'Tally.FormSubmitted',payload:{formId:${JSON.stringify(formId)}}}),'*')</script>` });
        }
        return route.abort();
      });
      await page.goto(`http://127.0.0.1:3003/${region}/consultation`, { waitUntil: 'networkidle', timeout: 25000 });
      const steps = page.locator('ol[aria-label="Progress"] > li');
      await steps.first().waitFor();
      assert.equal(await steps.nth(0).getAttribute('data-state'), 'current');
      assert.equal(await steps.nth(0).getAttribute('aria-current'), 'step');
      assert.equal(await steps.nth(0).evaluate(el => getComputedStyle(el).listStyleType), 'none');
      assert.equal(await page.locator('iframe').count(), 0);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Continue to assessment' }).click();
      assert.equal(await steps.nth(0).getAttribute('data-state'), 'completed');
      assert.equal(await steps.nth(1).getAttribute('data-state'), 'current');
      assert.equal(await steps.nth(1).getAttribute('aria-current'), 'step');
      assert.equal(await page.getByRole('button', { name: 'Review privacy notice' }).count(), 0);
      assert.notEqual(await steps.nth(0).evaluate(el => getComputedStyle(el).borderBottomColor), await steps.nth(1).evaluate(el => getComputedStyle(el).borderBottomColor));
      await page.screenshot({ path: `/tmp/consultation-progress-form-${width}.png` });
      await page.frameLocator('iframe').locator('#finish').evaluate(() => parent.postMessage(JSON.stringify({event:'Tally.FormLoaded',payload:{formId:'9q8RYQ'}}),'*'));
      await page.frameLocator('iframe').locator('#finish').click();
      const complete = page.getByRole('heading', { name: 'Your enquiry has been submitted.' });
      await complete.waitFor();
      assert.equal(await complete.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.getByRole('link', { name: 'FAQ', exact: true }).getAttribute('href'), `/${region}/faq`);
      assert.equal(await page.getByRole('link', { name: `${code}-support@solortide.com`, exact: true }).getAttribute('href'), `mailto:${code}-support@solortide.com`);
      assert.equal(await page.getByRole('link', { name: 'Back to home', exact: true }).last().getAttribute('href'), `/${region}`);
      await page.screenshot({ path: `/tmp/consultation-complete-${region}-${width}.png`, fullPage: true, animations: 'disabled' });
      assert.equal(await steps.nth(1).getAttribute('data-state'), 'completed');
      assert.equal(await steps.nth(2).getAttribute('data-state'), 'current');
      assert.equal(await steps.nth(2).getAttribute('aria-current'), 'step');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
      }
    }
    console.log('PASS: privacy → details → complete, current/completed styles, no duplicate markers, no review button; no real submissions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
