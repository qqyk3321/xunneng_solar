// Read-only social SEO regression. External forms and all writes are blocked.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003';
const canonicalOrigin = 'https://www.solortide.com';
const facebookUrl = 'https://www.facebook.com/1435499099637488';
const messengerUrl = 'https://m.me/1435499099637488';
const paths = ['/', '/antigua', '/dominica', '/antigua/faq', '/dominica/faq'];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      await context.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) return route.fulfill({ status: 204 });
        if (url.hostname.endsWith('tally.so')) return route.fulfill({ contentType: 'text/html', body: '<p>Test fixture</p>' });
        if (url.pathname.startsWith('/_vercel/')) return route.fulfill({ contentType: 'application/javascript', body: '' });
        return route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const idle = () => page.waitForFunction(() => !document.documentElement.dataset.siteLoading);

      for (const path of paths) {
        const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200, path);
        await idle();
        assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, new URL(path, canonicalOrigin).href);
        assert.doesNotMatch(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);

        if (!path.endsWith('/faq')) {
          const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.map(el => JSON.parse(el.textContent)));
          const organization = schemas.find(item => item['@type'] === 'Organization');
          assert.deepEqual(organization.sameAs, [facebookUrl]);
          assert.equal(organization.logo, canonicalOrigin + '/brand/solortide-logo.svg');
          assert.equal(organization.alternateName, 'Solortide');
        }

        if (path !== '/') {
          const contact = page.locator(path.endsWith('/faq') ? '#ask-question' : '#contact-us');
          await contact.scrollIntoViewIfNeeded();
          const methods = contact.getByRole('navigation', { name: 'Contact Solortide', exact: true });
          await methods.waitFor();
          assert.equal(await methods.getByRole('link', { name: 'Follow us on Facebook' }).getAttribute('href'), facebookUrl);
          assert.equal(await methods.getByRole('link', { name: 'Message us on Messenger' }).getAttribute('href'), messengerUrl);
          const email = path.startsWith('/antigua') ? 'ag-support@solortide.com' : 'dm-support@solortide.com';
          assert.equal(await methods.getByRole('link', { name: email, exact: true }).getAttribute('href'), `mailto:${email}`);
          assert.equal(await methods.locator('a[href*="instagram.com"]').count(), 0, 'Instagram remains unconfigured');
        }

        const footer = page.locator('footer');
        await footer.scrollIntoViewIfNeeded();
        const brandHome = footer.getByRole('link', { name: 'Solortide', exact: true });
        assert.equal(await brandHome.getAttribute('href'), '/');
        assert.equal(await footer.getByRole('link', { name: 'Solortide on Facebook' }).getAttribute('href'), facebookUrl);
        assert.equal(await footer.getByRole('link', { name: 'Message Solortide on Messenger' }).getAttribute('href'), messengerUrl);
        assert.match(await footer.textContent(), /Solortide — solar & storage built around your home\./);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path}: horizontal overflow at ${width}px`);
        const slug = path === '/' ? 'home' : path.slice(1).replaceAll('/', '-');
        await footer.screenshot({ path: `/tmp/solortide-social-seo-${slug}-${width}.png` });

        if (path !== '/') {
          const region = path.split('/')[1];
          assert.equal(await footer.getByRole('link', { name: 'Sol & Tide Energy home' }).getAttribute('href'), `/${region}`, 'regional logo navigation stays unchanged');
          await brandHome.click();
          await page.waitForURL(new URL('/', origin).href);
          await idle();
          assert.match(await page.title(), /^Solortide \| Sol & Tide Energy/);
        }
        console.log(`PASS ${path} ${width}px: social URLs, brand home link, regional navigation and layout`);
      }

      const logoResponse = await context.request.get(origin + '/brand/solortide-logo.svg');
      assert.equal(logoResponse.status(), 200);
      assert.match(logoResponse.headers()['content-type'], /image\/svg\+xml/);
      assert.doesNotMatch(logoResponse.headers()['x-robots-tag'] || '', /noindex/);
      assert.match(await logoResponse.text(), /width="512" height="512"/);
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
