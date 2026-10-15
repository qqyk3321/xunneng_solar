// Read-only checks: no enquiries or email requests are submitted.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [320, 1440]) for (const region of ['antigua', 'dominica']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      await page.goto(`${process.env.PREVIEW_TEST_ORIGIN || 'http://localhost:3003'}/${region}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const help = page.getByRole('button', { name: 'About the electricity tariff', exact: true });
      await help.waitFor();
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await help.scrollIntoViewIfNeeded();
      if (width > 600) await help.hover(); else await help.tap({ force: true }).catch(() => help.click());
      const panel = page.getByRole('region', { name: 'Tariff sources and assumptions' });
      await panel.waitFor();
      const text = await panel.innerText();
      assert.match(text, region === 'antigua' ? /APUA.*October 2026/s : /DOMLEC.*September 2026/s);
      assert.match(text, region === 'antigua' ? /0\.88/ : /0\.4338/);
      assert.match(text, /80% bill reduction/);
      const rect = await panel.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width);
      if (width === 320) {
        await panel.getByRole('button', { name: 'Close', exact: true }).click();
        await panel.waitFor({ state: 'hidden' });
      } else {
        await help.focus(); await help.press('Escape');
        await panel.waitFor({ state: 'hidden' });
      }
      await help.click();
      await panel.waitFor();
      await page.getByRole('heading', { name: 'Your monthly bill', exact: true }).click();
      await panel.waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log('PASS tariff help:', region, width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
