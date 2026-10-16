// Uses the real SDK without sending chat messages or submitting enquiries.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.KNOCKET_TEST_ORIGIN || 'http://127.0.0.1:3103';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      for (const region of ['antigua', 'dominica']) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        let sdkRequests = 0;
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => {
          if (request.url().startsWith('https://trtc.io/knocket-sdk/sdk.js?')) sdkRequests++;
        });
        await page.goto(`${origin}/${region}`, { waitUntil: 'domcontentloaded' });
        const launcher = page.locator('#contact-widget-auto .trtc-float-card__content');
        await launcher.waitFor({ timeout: 60000 });
        await page.locator('#contact-widget-auto').evaluate(element => { element.dataset.testInstance = 'original'; });

        for (const path of ['', '/faq']) {
          if (path) {
            // Use Next navigation to check that the existing widget survives.
            await page.locator(`footer a[href="/${region}${path}"]`).click();
            await page.waitForURL(`**/${region}${path}`);
          }
          const section = page.locator(path ? '#ask-question' : '#contact-us');
          await section.scrollIntoViewIfNeeded();
          const email = section.locator('#contact-email');
          await email.fill('widget-check@example.test');
          await section.locator('#contact-message').fill('Draft preserved while opening photos.');
          await section.getByRole('button', { name: 'Add photos', exact: true }).click();
          const dialog = page.locator('dialog[open]');
          await dialog.locator('[contenteditable=true]').waitFor();
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(await email.inputValue(), 'widget-check@example.test');
          assert.equal(await section.getByText('Message draft ready', { exact: true }).count(), 1);
          if (width === 1440) {
            const address = region === 'antigua' ? 'ag-support@solortide.com' : 'dm-support@solortide.com';
            await section.locator(`a[href="mailto:${address}"]`).waitFor();
            await section.getByRole('button', { name: /QR/i }).first().waitFor();
          }
          await launcher.click();
          await page.locator('#contact-widget-auto .trtc-knocket-card').waitFor();
          await page.evaluate(() => window.contactWidget.hideChat());
          await launcher.waitFor();
          assert.equal(await page.getByRole('button', { name: 'Chat on WhatsApp', exact: true }).count(), 0);
          assert.equal(await page.locator('script[src*="knocket-sdk/sdk.js"]').count(), 1);
          assert.equal(await page.locator('#contact-widget-auto').getAttribute('data-test-instance'), 'original');
          assert.equal(sdkRequests, 1, 'SDK loads once across client navigation');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        }
        assert.deepEqual(errors, []);
        console.log('PASS Knocket, client navigation, contact draft and no duplicate launcher:', region, width);
        if (width === 390) {
          const documentToken = await page.evaluate(() => {
            window.__knocketTestDocument = 'public';
            return window.__knocketTestDocument;
          });
          assert.equal(documentToken, 'public');
          await page.evaluate(region => {
            history.pushState(null, '', `/${region}/submission/knocket-private-fixture`);
          }, region);
          await page.waitForFunction(() => window.__knocketTestDocument === undefined);
          await page.waitForLoadState('networkidle');
          assert.equal(await page.locator('#contact-widget-auto').count(), 0);
          assert.equal(await page.locator('script[src*="knocket-sdk/sdk.js"]').count(), 0);
          assert.equal(sdkRequests, 1, 'Private navigation never reloads the third-party SDK');
          await page.reload({ waitUntil: 'networkidle' });
          assert.equal(await page.locator('script[src*="knocket-sdk/sdk.js"]').count(), 0);
          assert.equal(sdkRequests, 1, 'Direct private visits do not request the SDK');
          console.log('PASS private URL exclusion and fresh-document navigation:', region);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
