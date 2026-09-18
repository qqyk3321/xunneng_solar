// UI contract tests use mocked API responses; real database checks are separate.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      let responseStatus = 503;
      let calls = 0;
      await page.route('**/api/island-wishlist', async route => {
        calls++;
        const data = route.request().postDataJSON();
        assert.equal(data.email, 'test@example.com');
        assert.equal(data.islandCode, 'OTHER');
        assert.equal(data.otherIsland, 'Test Island');
        await new Promise(resolve => setTimeout(resolve, 200));
        await route.fulfill({ status: responseStatus, contentType: 'application/json', body: JSON.stringify(responseStatus === 200 ? { ok: true } : { error: 'Please try again shortly.' }) });
      });
      await page.goto(process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003/');
      const form = page.getByRole('form', { name: 'Bring solar to your island' });
      await form.getByRole('button').click();
      assert.equal(calls, 0, 'required validation blocks empty submission');
      await form.locator('select').selectOption('OTHER');
      await form.locator('[name=otherIsland]').fill('Test Island');
      await form.locator('[name=email]').fill('test@example.com');
      await form.getByRole('button').click();
      await form.getByRole('alert').waitFor();
      assert.equal(await form.locator('[name=email]').inputValue(), 'test@example.com');
      assert.equal(await page.getByRole('heading', { name: 'Your wish is on our list.' }).count(), 0);
      responseStatus = 200;
      await form.getByRole('button').click();
      await page.getByRole('heading', { name: 'Your wish is on our list.' }).waitFor();
      const receipt = page.getByRole('status').filter({ has: page.getByRole('heading', { name: 'Your wish is on our list.' }) });
      const typography = await receipt.evaluate(el => ({
        alignment: getComputedStyle(el).textAlign,
        titleSize: parseFloat(getComputedStyle(el.querySelector('h4')).fontSize),
        bodySize: parseFloat(getComputedStyle(el.querySelector('p')).fontSize),
      }));
      assert.equal(typography.alignment, 'center');
      assert.ok(typography.titleSize >= 30);
      assert.ok(typography.bodySize >= 16);
      await receipt.screenshot({ path: `/tmp/wishlist-receipt-${width}.png` });
      assert.equal(await form.count(), 0, 'success replaces form inline');
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS ${width}px wishlist validation, error recovery and inline success`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
