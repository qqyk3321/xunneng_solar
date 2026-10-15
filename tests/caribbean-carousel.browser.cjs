const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.BASE_URL || 'http://127.0.0.1:3003/';
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultNavigationTimeout(60000);
    await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
    const carousel = page.getByRole('region', { name: 'Benefits of hybrid solar and storage' });
    await carousel.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const active = () => carousel.locator('article[data-position="0"] h3').innerText();
    const waitForNewSlide = previous => page.waitForFunction(previous => document.querySelector('#hybrid-system article[data-position="0"] h3')?.innerText !== previous, previous, { timeout: 10000 });
    const first = await active();
    await waitForNewSlide(first);
    await carousel.hover();
    await page.waitForFunction(() => document.querySelector('#hybrid-system article[data-position="0"] span[style*="animation-play-state"]')?.style.animationPlayState === 'paused');
    const paused = await active();
    await page.mouse.move(0, 0);
    await waitForNewSlide(paused);
    const beforeClick = await active();
    await page.getByRole('button', { name: 'Show next solar benefit' }).click();
    await waitForNewSlide(beforeClick);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => {
      const progress = document.querySelector('#hybrid-system article[data-position="0"] span[style*="animation-play-state"]');
      return progress && progress.style.animationPlayState === 'paused' && getComputedStyle(progress).animationName === 'none';
    });
    console.log('PASS desktop: observed autoplay, hover pause/resume, image advance and reduced motion');
    for (const [width, height] of [[390, 844], [375, 667], [320, 740]]) {
      await page.setViewportSize({ width, height });
      const selector = page.getByRole('group', { name: 'Choose a solar benefit' });
      await selector.getByRole('button', { name: 'Savings', exact: true }).click();
      const section = page.locator('#hybrid-system');
      const sizes = [];
      for (const [label, title] of [['Savings', 'Use more of your own solar.'], ['Backup', 'Keep the essentials running.'], ['Clean energy', 'Clean energy, after sunset too.']]) {
        await selector.getByRole('button', { name: label, exact: true }).click();
        assert.equal(await selector.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true');
        assert.ok(await section.getByRole('heading', { name: title, exact: true }).isVisible());
        sizes.push(await section.evaluate(el => el.getBoundingClientRect().height));
      }
      assert.ok(Math.max(...sizes) <= height - 70 + 2, `benefits fit below the mobile header: ${sizes} / ${height}`);
      assert.ok(Math.max(...sizes) - Math.min(...sizes) < 2, 'selection does not jump in height');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => document.querySelector('#hybrid-system article[data-position="0"] span[style*="animation-play-state"]')?.style.animationPlayState === 'paused');
      await selector.getByRole('button', { name: 'Savings', exact: true }).click();
      await carousel.scrollIntoViewIfNeeded();
      const rect = await carousel.boundingBox();
      const input = await page.context().newCDPSession(page);
      const y = Math.max(80, rect.y + 70);
      await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width * .8, y }] });
      await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x + rect.width * .2, y }] });
      await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await input.detach();
      await page.waitForFunction(() => document.querySelector('[aria-label="Choose a solar benefit"] button:nth-of-type(2)')?.getAttribute('aria-pressed') === 'true');
      assert.equal(await selector.getByRole('button', { name: 'Backup', exact: true }).getAttribute('aria-pressed'), 'true');
      const disclosure = page.getByRole('button', { name: 'System controls & limits' });
      assert.equal(await page.locator('#hybrid-details').isVisible(), false);
      await disclosure.click();
      assert.equal(await disclosure.getAttribute('aria-expanded'), 'true');
      assert.ok(await page.locator('#hybrid-details').innerText().then(text => text.includes('Time-of-use') && text.includes('local tariffs')));
      await disclosure.click();
      assert.equal(await page.locator('#hybrid-details').isVisible(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS ${width}×${height}: compact manual benefits, stable height, swipe and expandable technical details`);
    }
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
