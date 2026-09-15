// Hydrates actual production HTML/JS through Playwright request interception.
// No HTTP server is started. No real API/Tally requests or database writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const build = process.env.REGION_BUILD_DIR;
assert.ok(build, 'Set REGION_BUILD_DIR to an isolated completed Next build');
const origin = 'https://region-build.example';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.addInitScript(() => {
        localStorage.setItem('sol-tide:installation-region:v1', 'AG');
        sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1');
      });
      const page = await context.newPage();
      const errors = [], submissions = [];
      page.on('pageerror', e => errors.push(e.message));
      page.setDefaultTimeout(15000);
      await context.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin === 'https://tally.so' && url.pathname.startsWith('/embed/')) return route.fulfill({ contentType: 'text/html', body: '<p>Mock assessment form</p>' });
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/api/contact') {
          submissions.push(req.postData());
          return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ reference: '12345678-1234-4234-8234-123456789abc', receivedAt: new Date().toISOString() }) });
        }
        let target, contentType;
        if (url.pathname.startsWith('/_next/static/')) target = path.join(build, '.next', decodeURIComponent(url.pathname.slice('/_next/'.length)));
        else if (/\.(svg|png|jpg|webp|ico)$/.test(url.pathname)) target = path.join(build, 'public', url.pathname);
        else {
          const stem = url.pathname === '/' ? 'index' : url.pathname.slice(1);
          const rsc = url.searchParams.has('_rsc') || req.headers().rsc === '1';
          target = path.join(build, '.next/server/app', stem + (rsc ? '.rsc' : '.html'));
          contentType = rsc ? 'text/x-component' : 'text/html';
        }
        if (!fs.existsSync(target)) return route.fulfill({ status: 404, body: 'Missing build asset' });
        contentType ||= ({ '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' })[path.extname(target)] || 'application/octet-stream';
        return route.fulfill({ path: target, contentType });
      });
      for (const [slug, country, name] of [['dominica', 'DM', 'Dominica'], ['antigua', 'AG', 'Antigua']]) {
        await page.goto(`${origin}/${slug}`, { waitUntil: 'networkidle' });
        assert.match(await page.title(), new RegExp(name));
        const expectedEmail = `${country.toLowerCase()}-support@solortide.com`;
        assert.equal(await page.locator('footer a[href^="mailto:"]').getAttribute('href'), `mailto:${expectedEmail}`);
        assert.equal(await page.locator(`a[href="mailto:${country === 'AG' ? 'dm' : 'ag'}-support@solortide.com"]`).count(), 0);
        const org = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
        assert.equal(org.contactPoint[0].email, expectedEmail);
        assert.match(await page.locator('header button[aria-label="Change installation location"]').innerText(), new RegExp(name));
        assert.equal(await page.locator('dialog[open]').count(), 0);
        assert.ok(await page.locator(`header a[href="/${slug}/consultation"]`).count());
        await page.locator('#contact-email').fill('browser-test@example.com');
        await page.locator('#contact-message').fill('Please help with solar for my home.');
        await page.locator('#contact-us').getByRole('button', { name: 'Send message', exact: true }).click();
        await page.getByRole('heading', { name: 'We’ve received your request.' }).waitFor();
        assert.match(submissions.at(-1), new RegExp(`name="country_code"\\r\\n\\r\\n${country}`));
        await page.getByRole('button', { name: 'Send another message' }).click();
        await page.locator('#contact-email').fill('browser-rich@example.com');
        await page.locator('#contact-message').fill('A rich message for this installation country.');
        await page.getByRole('button', { name: 'Add photos', exact: true }).click();
        const richDialog = page.locator('dialog[open]');
        await richDialog.getByRole('button', { name: 'Send message', exact: true }).click();
        await richDialog.getByRole('heading', { name: 'We’ve received your request.' }).waitFor();
        assert.match(submissions.at(-1), /name="format"\r\n\r\nrich/);
        assert.match(submissions.at(-1), new RegExp(`name="country_code"\\r\\n\\r\\n${country}`));
        await richDialog.getByRole('button', { name: 'Done', exact: true }).click();
        await page.locator(`footer a[href="/${slug}/faq"]`).click();
        await page.waitForURL(`${origin}/${slug}/faq`);
        assert.equal(await page.locator('footer a[href^="mailto:"]').getAttribute('href'), `mailto:${expectedEmail}`);
        await page.locator('#faq-search').fill('battery');
        assert.match(await page.locator('#ask-question').innerText(), new RegExp(name));
        await page.goto(`${origin}/${slug}/consultation`, { waitUntil: 'networkidle' });
        assert.match(await page.locator('h1').innerText(), new RegExp(name));
        await page.getByRole('checkbox').check();
        await page.getByRole('button', { name: 'Continue to assessment' }).click();
        const frame = page.getByTitle('Assessment details form');
        await frame.waitFor();
        assert.equal(new URL(await frame.getAttribute('src')).searchParams.get('installation_country'), country);
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.getByRole('checkbox').isChecked(), false);
        assert.match(await page.locator('h1').innerText(), new RegExp(name));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      await page.goto(`${origin}/dominica/faq`, { waitUntil: 'networkidle' });
      await page.locator('footer button[aria-label="Change installation location"]').click();
      const dialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
      await dialog.getByRole('button', { name: 'Close location selection' }).click();
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.locator('footer button[aria-label="Change installation location"]').click();
      await dialog.getByRole('button', { name: /Antigua.*Barbuda/ }).click();
      await dialog.getByRole('button', { name: 'Save location' }).click();
      await page.waitForURL(`${origin}/antigua/faq`);
      await page.goBack({ waitUntil: 'networkidle' });
      assert.match(await page.locator('header button[aria-label="Change installation location"]').innerText(), /Dominica/);
      await page.goto(origin, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('a[href^="mailto:"]').count(), 0);
      assert.ok(!('email' in JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())));
      assert.equal(await page.locator('#contact-email').isDisabled(), true);
      await dialog.waitFor({ state: 'visible' });
      assert.equal(await dialog.getByRole('button', { name: 'Continue', exact: true }).isDisabled(), true);
      assert.equal(await dialog.getByRole('button', { name: 'Close location selection' }).count(), 0);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.isVisible(), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await dialog.getByRole('button', { name: /Dominica/ }).click();
      await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL(`${origin}/dominica`);
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.goto(origin, { waitUntil: 'networkidle' });
      await dialog.waitFor({ state: 'visible' });
      await dialog.getByRole('button', { name: /Antigua.*Barbuda/ }).click();
      await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL(`${origin}/antigua`);
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.goto(`${origin}/dominica/privacy`, { waitUntil: 'networkidle' });
      assert.ok(await page.locator('main a[href="mailto:dm-support@solortide.com"]').count());
      await page.goto(`${origin}/faq`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('a[href^="mailto:"]').count(), 0);
      await page.locator('footer').getByRole('button', { name: 'Choose your location to contact support' }).click();
      await dialog.getByRole('button', { name: /Antigua.*Barbuda/ }).click();
      await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL(`${origin}/antigua/faq`);
      assert.equal(await page.locator('footer a[href^="mailto:"]').getAttribute('href'), 'mailto:ag-support@solortide.com');
      assert.deepEqual(errors, []);
      console.log(`PASS offline production browser ${width}: SSR/hydration, navigation, conflicting stored region ignored, country payload, FAQ, Tally, reload and back.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
