// Read-only checks against an already-running local server; no submissions.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      for (const path of ['/', '/antigua', '/dominica', '/antigua/faq', '/antigua/consultation']) {
        await page.goto(origin + path);
        await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} overflows at ${width}px`);
        const footer = page.locator('footer');
        if (await footer.count()) {
          const styles = await footer.evaluate(el => ['FAQ', 'Privacy policy', 'Cookie preferences'].map(text => {
            const node = [...el.querySelectorAll('button, a')].find(n => n.textContent.trim() === text);
            const s = getComputedStyle(node);
            return [s.fontSize, s.fontWeight, s.color];
          }));
          assert.ok(styles.every(style => JSON.stringify(style) === JSON.stringify(styles[0])), 'Footer link typography is consistent');
        }
        if (path === '/') {
          await page.locator('#journey').scrollIntoViewIfNeeded();
          assert.ok(await page.locator('#step-0 > h3 + p').evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 17));
        }
        if (path.endsWith('/faq')) {
          assert.ok(await page.locator('input[type="search"]').evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16));
          await page.locator('details summary').first().click();
          assert.ok(await page.locator('details[open] p').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16));
        }
        if (path === '/antigua' || path === '/') {
          await page.locator(path === '/' ? '#countries' : '#calculator').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `/tmp/readability-${path === '/' ? 'home' : 'antigua'}-${width}.png` });
        }
        console.log(`PASS ${width}px ${path}: readable text, consistent footer, no page overflow`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
