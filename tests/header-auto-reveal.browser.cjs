// Read-only: desktop reveals the complete navigation in a long rounded bar,
// then widens the shell. Mobile keeps its existing timed reveal and menu.
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
    const go = async path => {
      assert.equal((await page.goto(origin + path, { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'html { scroll-behavior:auto!important } nextjs-portal { display:none }' });
      await page.mouse.move(20, 800);
    };
    const at = async y => {
      await page.evaluate(y => { document.activeElement?.blur(); window.scrollTo(0, y); }, y);
      await page.waitForFunction(y => {
        const style = document.querySelector('header').style;
        const progress = Math.min(1, Math.max(0, (y - 80) / 200));
        const visible = Math.min(1, Math.max(0, (y - 12) / 44));
        return Math.abs(parseFloat(style.getPropertyValue('--header-progress')) - progress) < .002 && Math.abs(parseFloat(style.getPropertyValue('--header-visible')) - visible) < .002;
      }, y);
    };
    const shell = () => header.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, width: r.width, radius: parseFloat(getComputedStyle(el).borderRadius), opacity: parseFloat(getComputedStyle(el).opacity) };
    });
    for (const width of [1440, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/antigua', '/dominica']) {
        await go(path);
        await page.waitForFunction(() => document.querySelector('header').dataset.revealed === 'true');
        await at(0);
        assert((await shell()).opacity < .01, 'desktop stays hidden initially, including after the mobile timer');
        assert.equal(await header.getByRole('button', { name: 'Open navigation', exact: true }).count(), 0, 'no collapsed navigation or compact menu');
        if (output) await page.screenshot({ path: `${output}/${width}-${path.replaceAll('/', '') || 'home'}-initial.png` });
        await at(64);
        const rounded = await shell();
        assert(rounded.opacity > .98 && rounded.radius >= 40 && rounded.width > width * .9 && rounded.x >= 15);
        for (const label of ['Savings', 'Why solar', 'How it works', 'FAQ']) assert(await header.getByText(label, { exact: true }).isVisible(), `${label} remains present`);
        assert(await header.getByRole('link', { name: 'Sol & Tide Energy home' }).isVisible());
        assert(await header.getByText('Get Your Free Assessment', { exact: true }).last().isVisible());
        const controls = await header.locator('a,button').evaluateAll(els => els.filter(el => el.getBoundingClientRect().width).map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
        assert(controls.every(r => r.left >= rounded.x && r.right <= rounded.x + rounded.width), 'complete navigation fits inside rounded shell');
        if (output) await page.screenshot({ path: `${output}/${width}-${path.replaceAll('/', '') || 'home'}-rounded.png` });
        await at(180);
        const middle = await shell();
        assert(middle.x > 0 && middle.x < rounded.x && middle.radius > 0 && middle.radius < rounded.radius);
        await at(300);
        const full = await shell();
        assert(full.x < .2 && full.width > width - .4 && full.radius < .2, 'full-width rectangular header');
        if (output) await page.screenshot({ path: `${output}/${width}-${path.replaceAll('/', '') || 'home'}-full.png` });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const selector = path === '/' ? header.getByRole('button', { name: 'Get Your Free Assessment', exact: true }) : header.getByRole('button', { name: 'Change installation location' });
        await selector.click();
        const dialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
        assert(await dialog.isVisible());
        await dialog.evaluate(el => el.addEventListener('close', () => { el.dataset.closedForTest = 'true'; }, { once: true }));
        await dialog.getByRole('button', { name: 'Close location selection' }).click();
        await page.waitForFunction(() => document.querySelector('dialog[data-closed-for-test="true"]'));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        await at(0);
        await header.getByRole('link', { name: 'Sol & Tide Energy home' }).focus();
        assert((await shell()).opacity > .98, 'keyboard focus reveals complete navigation at the top');
        await page.keyboard.press('Tab');
        assert(await header.getByRole('navigation').evaluate(el => el.contains(document.activeElement)));
        await at(0);
        console.log(`PASS ${width}px ${path}: hidden initially, complete rounded bar, continuous widening, full width, reverse, dialog and keyboard`);
      }
    }
    for (const path of ['/', '/antigua', '/dominica']) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await go(path);
      await at(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.querySelector('header').dataset.revealed === 'true');
      assert.equal(await header.evaluate(el => getComputedStyle(el).opacity), '1');
      const toggle = header.getByRole('button', { name: 'Open menu', exact: true });
      await toggle.click();
      assert(await header.getByRole('navigation').isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      console.log(`PASS ${path}: mobile reveal/menu and viewport resize unchanged`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go('/antigua');
    await page.waitForFunction(() => document.querySelector('header').style.getPropertyValue('--header-visible') === '1.0000');
    assert((await shell()).opacity > .98);
    assert((await shell()).radius < .2);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await at(0);
    await go('/antigua/faq');
    assert.equal(await header.getAttribute('data-immersive-header'), null);
    assert(await header.getByRole('navigation').isVisible());
    assert.deepEqual(errors, []);
    console.log('PASS reduced motion, live preference changes, normal FAQ header and no browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
