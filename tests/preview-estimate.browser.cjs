// Uses synthetic records created for this check. Never modifies pricing or sends mail.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const origin = process.env.PREVIEW_TEST_ORIGIN || 'http://127.0.0.1:3003';

(async () => {
  const fixtures = JSON.parse(await fs.readFile(process.env.PREVIEW_ESTIMATE_FIXTURE || require('node:path').join(__dirname, 'fixtures/cleanup-quote-baseline.json'), 'utf8'));
  assert.equal(fixtures.length, 3);
  assert.ok(fixtures.every(f => f.submission_id.startsWith('preview-test-')));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const fixture of fixtures) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { try { sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'); } catch {} });
      await page.route('https://tally.so/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Original submitted details</h1>' }));
      const region = fixture.country === 'DM' ? 'dominica' : 'antigua';
      const response = await page.goto(`${origin}/${region}/submission/${fixture.token}`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      assert.match(response.headers()['cache-control'], /no-store/);
      await page.getByTitle('Consultation record preview').waitFor();
      assert.equal(await page.locator('header').count(), 1);
      assert.equal(await page.locator('footer').count(), 1);
      const estimate = fixture.estimate;
      if (estimate.status === 'ready') {
        const card = page.getByTestId('preview-estimate');
        const metricText = async id => (await card.getByTestId(id).innerText()).replace(/\s+/g, ' ').replace(/^Approximately\s*~\s*/, '~ ').replace(/EC\$\s+/, 'EC$');
        assert.equal(await metricText('preview-quote'), `~ EC$${estimate.quoteXcd.toLocaleString('en-US')}`);
        assert.equal(await metricText('preview-saved-kwh'), `~ ${Math.round(estimate.annualSavedKwh).toLocaleString('en-US')} kWh`);
        assert.equal(await metricText('preview-payback'), estimate.paybackYears === null ? "—" : `~ ${estimate.paybackYears.toFixed(1)} years`);
        assert.equal(await card.locator('dd').count(), 3);
        assert.equal(await card.locator('details, time, p').count(), 0);
        const reloaded = await page.reload({ waitUntil: 'domcontentloaded' });
        assert.match(reloaded.headers()['cache-control'], /no-store/);
        await card.waitFor();
      } else {
        await page.getByTestId('preview-estimate-unavailable').waitFor();
        assert.equal(await page.getByTestId('preview-quote').count(), 0, 'legacy input cannot invent a price');
      }
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1080 });
        await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (fixture.label === 'AG' && width !== 320)
          await page.screenshot({ path: `/tmp/customer-estimate-${width}.png`, fullPage: true });
      }
      const wrongRegion = region === 'antigua' ? 'dominica' : 'antigua';
      const rejected = await page.goto(`${origin}/${wrongRegion}/submission/${fixture.token}`);
      // Next may already have streamed the loading shell with status 200.
      assert.ok([200, 404].includes(rejected.status()));
      await page.getByRole('heading', { name: '404', exact: true }).waitFor();
      assert.equal(await page.getByTestId('preview-estimate').count(), 0, 'wrong country exposes no estimate');
      assert.equal(await page.getByTitle('Consultation record preview').count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS concise customer estimate and region protection: ${fixture.label}`);
    }
    const page = await browser.newPage();
    const rejected = await page.goto(`${origin}/antigua/submission/${'x'.repeat(43)}`);
    assert.ok([200, 404].includes(rejected.status()));
    await page.getByRole('heading', { name: '404', exact: true }).waitFor();
    assert.equal(await page.getByTestId('preview-estimate').count(), 0);
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error('Customer estimate browser check failed:', String(error.message).replace(/[A-Za-z0-9_-]{40,}/g, '[redacted]')); process.exitCode = 1; });
