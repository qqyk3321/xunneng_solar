const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const region of ['antigua', 'dominica']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`http://127.0.0.1:3003/${region}`);
      const header = page.getByTestId('home-header');
      await page.waitForTimeout(700);
      assert.equal(await header.getAttribute('data-revealed'), null);
      const hero = await page.locator('section[aria-labelledby="hero-title"]').boundingBox();
      assert.equal(hero.y, 0);
      assert.ok(hero.height >= 900);
      await page.mouse.move(600, 300);
      await page.mouse.move(600, 20);
      await page.waitForTimeout(500);
      assert.equal(await header.getAttribute('data-revealed'), 'true');
      await page.mouse.move(600, 600);
      assert.equal(await header.getAttribute('data-revealed'), 'true');
      await page.screenshot({ path: `/tmp/immersive-${region}.png` });
      await page.mouse.move(600, 300);
      await page.reload();
      await page.waitForTimeout(700);
      await page.evaluate(() => scrollTo(0, 120));
      await page.waitForFunction(() => document.querySelector('[data-testid="home-header"]').dataset.revealed === 'true');
      await page.evaluate(() => scrollTo(0, 0));
      await page.reload();
      await page.waitForTimeout(700);
      await page.keyboard.press('Tab');
      await page.waitForFunction(() => document.querySelector('[data-testid="home-header"]').dataset.revealed === 'true');
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:3003/dominica');
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Savings', exact: true }).click();
    assert.equal(await page.getByTestId('home-header').getAttribute('data-menu-open'), null);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(700);
    await page.screenshot({ path: '/tmp/immersive-mobile.png' });
    await page.goto('http://127.0.0.1:3003/antigua/faq');
    assert.equal(await page.getByTestId('home-header').getAttribute('data-immersive-header'), null);
    console.log('Immersive regional home checks passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
