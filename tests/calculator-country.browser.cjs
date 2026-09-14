// Read-only check using the user's existing development server.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.route('https://**/*', route => route.abort());
      await page.goto(process.env.PREVIEW_TEST_ORIGIN || 'http://127.0.0.1:3003', { waitUntil: 'networkidle' });
      const calc = page.getByTestId('calculator-module');
      await calc.getByRole('button', { name: 'Dominica', exact: true }).click();
      await calc.locator('button[aria-pressed="true"]').filter({ hasText: 'Dominica' }).waitFor();
      assert.equal(await calc.getByRole('button', { name: 'Dominica', exact: true }).getAttribute('aria-pressed'), 'true');
      const slider = calc.getByRole('slider');
      assert.equal(await slider.getAttribute('min'), '326');
      assert.equal(await slider.getAttribute('max'), '2280');
      await slider.fill('556');
      await calc.getByTestId('monthly-saving').filter({ hasText: 'EC$ 445' }).waitFor();
      assert.equal(await calc.getByTestId('monthly-saving').textContent(), 'EC$ 445');
      await calc.getByRole('button', { name: 'About the electricity tariff' }).click();
      const sources = calc.getByRole('region', { name: 'Tariff sources and assumptions' });
      assert.match(await sources.textContent(), /footnote 150/);
      assert.match(await sources.textContent(), /15%/);
      assert.equal(await sources.getByRole('link').count(), 4);
      await sources.getByRole('link').first().focus();
      assert.equal(await sources.isVisible(), true);
      await page.screenshot({ path: `/tmp/calculator-dominica-${width}.png` });
      await calc.getByRole('button', { name: 'Antigua', exact: true }).click();
      await calc.locator('button[aria-pressed="true"]').filter({ hasText: 'Antigua' }).waitFor();
      assert.equal(await slider.getAttribute('min'), '360');
      assert.equal(await slider.inputValue(), '556');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
    }
    console.log('Country selection, VAT preset, sources, keyboard focus and responsive layout passed.');
  } finally { await browser.close(); }
})();
