// Read-only checks: never submit an assessment or send a real enquiry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HEADER_TEST_ORIGIN || 'http://127.0.0.1:3191';
const output = process.env.HEADER_TEST_OUTPUT;
const submission = process.env.HEADER_TEST_SUBMISSION_PATH;

(async () => {
  if (output) fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.abort();
      if (url.hostname.endsWith('tally.so')) return route.fulfill({ contentType: 'text/html', body: '<p>Consultation preview</p>' });
      return route.continue(process.env.HEADER_TEST_BYPASS && url.origin === origin
        ? { headers: { ...request.headers(), 'x-vercel-protection-bypass': process.env.HEADER_TEST_BYPASS } } : {});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const header = page.getByTestId('home-header');
    const nav = header.getByRole('navigation', { name: 'Main navigation', includeHidden: true });
    const toggle = header.locator('button[aria-controls="regional-main-nav"]');
    const go = async path => {
      assert.equal((await page.goto(origin + path, { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.evaluate(() => document.fonts.ready);
      if (await header.getAttribute('data-immersive-header')) {
        await page.waitForFunction(() => document.querySelector('[data-testid="home-header"]').dataset.revealed === 'true');
      }
    };
    const routes = ['/', '/antigua', '/dominica', '/antigua/faq', '/dominica/faq', '/antigua/how-it-works', '/dominica/how-it-works', '/privacy'];
    if (submission) routes.push(submission);
    for (const path of routes) {
      await page.setViewportSize({ width: 390, height: 844 });
      await go(path);
      for (const width of [320, 390, 768, 1000, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        const mobile = width <= 1000;
        assert.equal(await toggle.isVisible(), mobile, `${path}: menu toggle at ${width}`);
        assert.equal(await nav.isVisible(), !mobile);
        if (!mobile) continue;
        assert.equal(await header.getByText('FAQ', { exact: true }).isVisible(), false);
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        const controls = await header.evaluate(el => {
          const links = [el.querySelector('a[aria-label="Sol & Tide Energy home"]'), el.querySelector('button[aria-label="Change installation location"]'), el.querySelector('button[aria-controls="regional-main-nav"]')].filter(Boolean);
          return links.map(link => { const r = link.getBoundingClientRect(); return { x: r.x, right: r.right, height: r.height, y: r.y, bottom: r.bottom }; });
        });
        for (let i = 0; i < controls.length; i++) {
          assert(controls[i].x >= 0 && controls[i].right <= width, `${path}: header fits ${width}`);
          if (i) assert(controls[i - 1].right + 2 <= controls[i].x, `${path}: header controls do not overlap at ${width}`);
        }
        assert.equal(controls.at(-1).height, 44);
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(await nav.isVisible(), true);
        assert.equal(await nav.getByText('FAQ', { exact: true }).isVisible(), true);
        assert.equal(await nav.getByText('Get Your Free Assessment', { exact: true }).isVisible(), true);
        if (output && width === 390) {
          const name = path.includes('/submission/') ? 'submission' : path.replaceAll('/', '-') || 'root';
          await page.screenshot({ path: `${output}/${name}-menu.png` });
          await toggle.click();
          await header.screenshot({ path: `${output}/${name}-header.png` });
          await toggle.click();
        }
        await nav.getByText('FAQ', { exact: true }).focus();
        await page.keyboard.press('Escape');
        assert.equal(await nav.isVisible(), false);
        assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      }
      console.log(`PASS ${path.includes('/submission/') ? 'submission' : path}: shared mobile header, menu and desktop at five widths`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await go('/antigua/faq');
    await toggle.click();
    await nav.getByRole('link', { name: 'How it works', exact: true }).click();
    await page.waitForURL(origin + '/antigua/how-it-works');
    assert.equal(await nav.isVisible(), false);
    await toggle.click();
    await nav.getByRole('link', { name: 'FAQ', exact: true }).click();
    await page.waitForURL(origin + '/antigua/faq');
    await header.getByRole('button', { name: 'Change installation location' }).click();
    const dialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
    await dialog.getByRole('button', { name: 'Dominica', exact: false }).click();
    await page.waitForURL(origin + '/dominica/faq');
    await toggle.click();
    assert.equal(await nav.getByRole('link', { name: 'Savings', exact: true }).getAttribute('href'), '/dominica#calculator');
    await nav.getByRole('link', { name: 'Get Your Free Assessment', exact: true }).click();
    await page.waitForURL(origin + '/dominica/consultation');
    assert.equal(await page.getByRole('checkbox').isChecked(), false);

    await page.setViewportSize({ width: 320, height: 400 });
    await go('/antigua/faq');
    await toggle.click();
    const assessment = nav.getByRole('link', { name: 'Get Your Free Assessment', exact: true });
    await assessment.scrollIntoViewIfNeeded();
    const bounds = await assessment.boundingBox();
    assert(bounds.y >= 72 && bounds.y + bounds.height <= 400, 'last menu entry remains reachable on short screens');
    assert.deepEqual(errors, []);
    console.log('PASS navigation destinations, region switching, Escape/focus return, assessment entry and short-screen scrolling; no client errors');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
