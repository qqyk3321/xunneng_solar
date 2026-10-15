// Read-only layout check against an existing preview URL. No form submissions.
// PREVIEW_TEST_URL is private: do not log it or include it in test output.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  assert.ok(process.env.PREVIEW_TEST_URL, 'Set PREVIEW_TEST_URL');
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 640, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      let releasePreview;
      const previewReady = new Promise(resolve => { releasePreview = resolve; });
      await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      // Keep third-party response contents out of screenshots and test output.
      await page.route('https://tally.so/**', async route => { await previewReady; await route.fulfill({
        contentType: 'text/html', body: '<html><body><p>Submitted consultation preview</p><div style="height:1600px"></div><p>End of submitted details</p></body></html>',
      }); });
      await page.goto(process.env.PREVIEW_TEST_URL, { waitUntil: 'domcontentloaded' });
      await page.locator('#preview-title').waitFor();
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      const summary = await page.getByRole('complementary', { name: 'Contact and submission details' }).boundingBox();
      const record = await page.locator('section[aria-label="Your submitted consultation"]').boundingBox();
      assert.match(await page.getByTestId('submission-monthly-kwh').innerText(), /^[\d,.]+ kWh$/);
      assert.match(await page.getByTestId('submission-energy-profile').innerText(), /^(Daytime use|Daytime peak|Evening peak|Nighttime peak)$/);
      const card = page.getByTestId('preview-estimate');
      const result = await card.boundingBox();
      assert.equal(await card.locator('dd').count(), 3);
      for (const id of ['preview-quote', 'preview-saved-kwh', 'preview-payback'])
        assert.match((await card.getByTestId(id).innerText()).replace(/\s+/g, ' '), /^About /);
      assert.equal(await card.locator('details, time, p').count(), 0);
      assert.doesNotMatch(await card.innerText(), /Annual bill|Updated|assumptions|reference electricity rates|less electricity from the grid/i);
      const tariffHelp = card.getByRole('button', { name: 'About the electricity tariff' });
      await tariffHelp.click();
      const tariff = card.getByRole('region', { name: 'Tariff sources and assumptions' });
      await tariff.waitFor();
      assert.match(await tariff.innerText(), /DOMLEC.*September 2026/s);
      assert.match(await tariff.innerText(), /0\.4338/);
      assert.match(await tariff.innerText(), /no VAT on fuel surcharge/);
      assert.match(await tariff.innerText(), /1 Nov 2026/);
      const popup = await tariff.boundingBox();
      assert.ok(popup.x >= 0 && popup.x + popup.width <= width, 'Tariff panel fits mobile viewport');
      await tariff.getByRole('button', { name: 'Close', exact: true }).click();
      await tariff.waitFor({ state: 'hidden' });
      assert.ok(record.y >= result.y + result.height, 'Original submission remains below the three-number quote');
      assert.equal(await page.locator('ol[aria-label="Submission progress"]').count(), 0);
      assert.equal(await page.getByText('ALL STEPS COMPLETE', { exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Copy', exact: true }).count(), 0);
      assert.equal(await page.locator('header').count(), 1);
      assert.equal(await page.locator('footer').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width > 960) {
        assert.ok(Math.abs(summary.y - result.y) < 2, 'Summary and quote align at the top');
        assert.ok(record.x >= summary.x + summary.width, 'Preview is on the right');
        assert.ok(record.width > summary.width, 'Preview is wider than summary');
      } else {
        assert.ok(record.y >= summary.y + summary.height, 'Mobile stacks preview below summary');
      }
      for (const time of await page.locator('time').all()) {
        assert.ok(await time.evaluate(el => {
          const range = document.createRange(); range.selectNodeContents(el);
          const tops = [...range.getClientRects()].map(rect => rect.top);
          return Math.max(...tops) - Math.min(...tops) < 10;
        }), 'Date and time stay on one line');
      }
      const frame = page.getByTitle('Consultation record preview');
      releasePreview();
      await page.getByRole('heading', { name: 'Loading your consultation…' }).waitFor({ state: 'hidden' });
      assert.equal(await frame.getAttribute('scrolling'), 'auto');
      assert.ok((await frame.boundingBox()).height >= 640);
      if (width === 1440 || width === 390) {
        await page.screenshot({ path: `/tmp/preview-columns-${width}.png`, fullPage: true });
      }
      console.log('PASS original layout, submitted record and concise three-number quote:', width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(() => { console.error('Preview layout test failed (private details suppressed).'); process.exitCode = 1; });
