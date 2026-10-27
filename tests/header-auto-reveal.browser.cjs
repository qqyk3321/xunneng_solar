// Read-only header checks. Desktop follows scroll; mobile keeps its timed reveal.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003';
const output = process.env.HEADER_TEST_OUTPUT;

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
    await context.route('https://trtc.io/knocket-sdk/**', route => route.fulfill({ body: '', contentType: 'application/javascript' }));
    await context.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.fallback() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const header = page.getByTestId('home-header');
    const compact = page.getByRole('button', { name: 'Open navigation', exact: true });
    const go = async path => {
      assert.equal((await page.goto(origin + path, { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'html { scroll-behavior:auto!important } nextjs-portal { display:none }' });
      await page.mouse.move(20, 800);
    };
    const at = async y => {
      await page.evaluate(y => window.scrollTo(0, y), y);
      await page.waitForFunction(y => Math.abs(parseFloat(document.querySelector('header').style.getPropertyValue('--header-progress')) - Math.min(1, y / 200)) < .002, y);
    };
    for (const width of [1440, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/antigua', '/dominica']) {
        await go(path);
        // Waiting for the original timer proves desktop no longer auto-expands.
        await page.waitForFunction(() => document.querySelector('header').dataset.revealed === 'true');
        await at(0);
        assert(await compact.isVisible());
        assert(await page.locator('#site-header-content').evaluate(el => el.inert));
        assert.equal(await header.evaluate(el => getComputedStyle(el).opacity), '1');
        const collapsedWidth = await header.evaluate(el => parseFloat(getComputedStyle(el, '::before').width));
        assert(Math.abs(collapsedWidth - 264) < 2);
        if (output) await page.screenshot({ path: `${output}/${width}-${path.replaceAll('/', '') || 'home'}-compact.png` });
        await at(100);
        const middleWidth = await header.evaluate(el => parseFloat(getComputedStyle(el, '::before').width));
        assert(middleWidth > collapsedWidth + 200 && middleWidth < width - 200);
        await at(220);
        assert.equal(await page.locator('#site-header-content').evaluate(el => el.inert), false);
        assert.equal(await compact.isVisible(), false);
        assert.equal(await header.getByRole('navigation').isVisible(), true);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (output) await page.screenshot({ path: `${output}/${width}-${path.replaceAll('/', '') || 'home'}-expanded.png` });
        await at(0);
        await compact.click();
        await page.waitForFunction(() => document.querySelector('header').hasAttribute('data-desktop-expanded'));
        assert.equal(await header.getByRole('link', { name: 'Sol & Tide Energy home' }).evaluate(el => el === document.activeElement), true);
        // Regional selector / root assessment still opens its real dialog.
        const selector = path === '/' ? header.getByRole('button', { name: 'Get Your Free Assessment', exact: true }) : header.getByRole('button', { name: 'Change installation location' });
        await selector.click();
        const dialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
        assert(await dialog.isVisible());
        await dialog.evaluate(el => el.addEventListener('close', () => { el.dataset.closedForTest = 'true'; }, { once: true }));
        await dialog.getByRole('button', { name: 'Close location selection' }).click();
        await page.waitForFunction(() => document.querySelector('dialog[data-closed-for-test="true"]'));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        await page.waitForFunction(() => document.querySelector('header').contains(document.activeElement));
        await page.keyboard.press('Escape');
        await at(0);
        assert.equal(await compact.evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('header').hasAttribute('data-desktop-expanded'));
        await page.keyboard.press('Tab');
        assert.equal(await header.getByRole('navigation').evaluate(el => el.contains(document.activeElement)), true);
        await page.keyboard.press('Escape');
        await at(0);
        console.log(`PASS ${width}px ${path}: compact, continuous midpoint, expanded, reversed, pointer/dialog/keyboard`);
      }
    }
    // Resizing out of desktop must immediately remove inert from mobile controls.
    for (const path of ['/', '/antigua', '/dominica']) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await go(path);
      await at(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => !document.getElementById('site-header-content').inert);
      await page.waitForFunction(() => document.querySelector('header').dataset.revealed === 'true');
      assert.equal(await compact.isVisible(), false);
      const toggle = header.getByRole('button', { name: 'Open menu', exact: true });
      await toggle.click();
      assert.equal(await header.getByRole('navigation').isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      console.log(`PASS ${path}: mobile timer/menu and desktop-to-mobile resize unchanged`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go('/antigua');
    await page.waitForFunction(() => document.querySelector('header').hasAttribute('data-desktop-expanded'));
    assert.equal(await compact.isVisible(), false);
    assert.equal(await page.locator('#site-header-content').evaluate(el => el.inert), false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await at(0);
    console.log('PASS reduced motion: full navigation without animation; preference can change live');
    await go('/antigua/faq');
    assert.equal(await header.getAttribute('data-immersive-header'), null);
    assert.equal(await header.getByRole('navigation').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS FAQ retains normal header; no browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
