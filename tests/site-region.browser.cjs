// Existing user-managed dev server only. Browser submissions are intercepted;
// real database persistence is verified by scripts/test-contact-storage-live.ts.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.REGION_TEST_ORIGIN || 'http://127.0.0.1:3003';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      // Old preference intentionally conflicts; URL must always win.
      await context.addInitScript(() => {
        // Do not seed storage in blocked external Tally frames.
        if (window.top !== window) return;
        localStorage.setItem('sol-tide:installation-region:v1', 'DM');
        sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1');
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**/*', route => route.abort());
      let submitted;
      await page.route('**/api/contact', async route => {
        submitted = route.request().postData();
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ reference: '12345678-1234-4234-8234-123456789abc', receivedAt: new Date().toISOString() }) });
      });
      for (const [slug, code, name] of [['dominica', 'DM', 'Dominica'], ['antigua', 'AG', 'Antigua']]) {
        const region = slug || 'antigua';
        const response = await page.goto(`${origin}/${slug}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        const raw = await response.text();
        assert.match(raw, new RegExp(`Solar &amp; Battery Storage in ${name}`));
        assert.ok(raw.includes(`/${region}/consultation`), 'SSR navigation must already contain the region');
        await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
        assert.equal(page.url(), `${origin}/${slug}`, 'regional path must not redirect');
        assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname, `/${region}`);
        assert.equal(await page.locator(`footer a[href="/${region}/privacy"]`).count(), 1);
        assert.equal(await page.locator('dialog[open]').count(), 0);
        const location = page.locator('header button[aria-label="Change installation location"]');
        assert.match(await location.innerText(), new RegExp(name));
        assert.equal(await location.locator('img').getAttribute('src'), `/flags/${code.toLowerCase()}.svg`);
        const contact = page.locator('#contact-us');
        await contact.locator('#contact-email').fill('browser-test@example.com');
        await contact.locator('#contact-message').fill('Please tell me about solar for my home.');
        await contact.locator('#contact-privacy').check();
        await contact.getByRole('button', { name: 'Send message', exact: true }).click();
        await contact.getByRole('heading', { name: 'We’ve received your request.' }).waitFor();
        assert.match(submitted, new RegExp(`name="country_code"\\r\\n\\r\\n${code}`));
        await page.locator(`footer a[href="/${region}/faq"]`).click();
        await page.waitForURL(`${origin}/${region}/faq`);
        await page.locator('#faq-search').fill('battery');
        assert.match(await page.locator('header button[aria-label="Change installation location"]').innerText(), new RegExp(name));
        await page.locator('#ask-question').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('#ask-question #contact-email').isDisabled(), false);
        await page.locator(`footer a[href="/${region}/consultation"]`).click();
        await page.waitForURL(`${origin}/${region}/consultation`);
        assert.match(await page.locator('header').innerText(), new RegExp(name));
        assert.equal(await page.locator('iframe').count(), 0);
        await page.getByRole('checkbox').check();
        await page.getByRole('button', { name: 'Continue to assessment' }).click();
        const frame = page.getByTitle('Assessment details form');
        await frame.waitFor();
        assert.equal(new URL(await frame.getAttribute('src')).searchParams.get('installation_country'), code);
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert.equal(await page.getByRole('checkbox').isChecked(), false);
        assert.match(await page.locator('header').innerText(), new RegExp(name));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      await page.goto(`${origin}/dominica/faq`, { waitUntil: 'domcontentloaded' });
      await page.locator('footer button[aria-label="Change installation location"]').click();
      const dialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
      await dialog.getByRole('button', { name: /Antigua.*Barbuda/ }).click();
      await page.waitForURL(`${origin}/antigua/faq`);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      assert.match(await page.locator('header button[aria-label="Change installation location"]').innerText(), /Dominica/);
      await page.goto(`${origin}/antigua`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      assert.equal(await dialog.isVisible(), false);
      assert.equal(await page.locator('#contact-email').isDisabled(), false);
      await page.locator('footer button[aria-label="Change installation location"]').click();
      await dialog.waitFor({ state: 'visible' });
      assert.equal(await dialog.getByRole('button', { name: /Antigua.*Barbuda/ }).getAttribute('aria-pressed'), null);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.isVisible(), false);
      await page.locator('footer button[aria-label="Change installation location"]').click();
      await dialog.getByRole('button', { name: /Antigua/ }).click();
      assert.equal(page.url(), `${origin}/antigua`, 'choosing the current country is a no-op');
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.siteLoading), undefined);
      await page.locator('footer button[aria-label="Change installation location"]').click();
      await dialog.getByRole('button', { name: /Dominica/ }).click();
      await page.waitForURL(`${origin}/dominica`);
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.goBack();
      await page.waitForURL(`${origin}/antigua`);
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      assert.equal(await dialog.isVisible(), false);
      assert.match(await page.locator('header button[aria-label="Change installation location"]').innerText(), /Antigua/);
      for (const path of ['/consultation', '/faq', '/how-it-works', '/antigua/privacy', '/dominica/privacy']) {
        assert.equal((await context.request.get(origin + path)).status(), 404, path);
      }
      // A streamed notFound response may have sent HTTP 200 before resolution.
      // Check the rendered error and noindex, never an Antigua fallback.
      await page.goto(`${origin}/unsupported-country`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: '404', exact: true }).waitFor();
      assert.ok(await page.locator('meta[name="robots"][content="noindex"]').count() > 0);
      assert.equal(await page.locator('[data-testid="home-hero"]').count(), 0);
      assert.equal((await context.request.get(`${origin}/auth-preview`)).status(), 404);
      const sitemap = await (await context.request.get(`${origin}/sitemap.xml`)).text();
      assert.match(sitemap, /dominica/);
      assert.doesNotMatch(sitemap, /preview/);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS: regional business links, SSR metadata, country submission, FAQ context, Tally hidden field, reload, switch/back, flags, voluntary selection, invalid routes, sitemap, responsive layout. Root covered by caribbean-home.browser.cjs.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
