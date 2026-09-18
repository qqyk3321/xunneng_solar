const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3003/');
    const carousel = page.getByRole('region', { name: 'Benefits of hybrid solar and storage' });
    await carousel.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const active = () => carousel.locator('article[data-position="0"] h3').innerText();
    const first = await active();
    await page.waitForTimeout(4500);
    assert.notEqual(await active(), first, 'automatically advances');
    await carousel.hover();
    const hovered = await active();
    await page.waitForTimeout(4500);
    assert.equal(await active(), hovered, 'pauses on hover');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(4500);
    assert.notEqual(await active(), hovered, 'resumes after hover');
    const paused = await active();
    await page.getByRole('button', { name: 'Show next solar benefit' }).click();
    assert.notEqual(await active(), paused, 'image click advances');
    assert.equal(await page.getByRole('button', { name: 'Next example' }).count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await carousel.scrollIntoViewIfNeeded();
    const reduced = await active();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(4500);
    assert.equal(await active(), reduced, 'respects reduced motion');
    console.log('PASS 4-second autoplay, hover, image click and reduced motion');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
