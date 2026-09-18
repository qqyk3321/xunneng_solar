const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      for (const route of ['/', '/antigua', '/dominica']) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.mouse.move(width - 10, 800);
        await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
        await page.goto(origin + route);
        const header = page.locator('header');
        assert.equal(await header.getAttribute('data-immersive-header'), 'true');
        await page.waitForFunction(() => document.querySelector('header')?.dataset.revealed === 'true', null, { timeout: 5000 });
        await page.waitForTimeout(450);
        assert.equal(await header.evaluate(node => getComputedStyle(node).opacity), '1');
        assert.equal(await page.evaluate(() => window.scrollY), 0);
        assert.ok(await header.locator('a').first().isVisible());
        console.log(`PASS ${width}px ${route}: header reveals without scrolling`);
        await page.close();
      }
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(origin + '/antigua/faq');
    assert.equal(await page.locator('header').getAttribute('data-immersive-header'), null);
    console.log('PASS FAQ retains normal header');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
