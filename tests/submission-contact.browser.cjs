// Synthetic backend only; inspects destinations without opening WhatsApp or sending mail.
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const jsQR = require('jsqr');
const origin = process.env.PREVIEW_TEST_ORIGIN || 'http://localhost:3188';
const output = process.env.SUBMISSION_CONTACT_ARTIFACTS || '/tmp/submission-contact-qr';

(async () => {
  await fs.mkdir(output, { recursive: true });
  const fixtures = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures/cleanup-quote-baseline.json'), 'utf8'));
  const engines = { chromium, webkit };
  for (const name of (process.env.QR_TEST_BROWSERS || 'chromium').split(',')) {
    const engine = engines[name];
    const browser = await engine.launch({ headless: true });
    try {
      for (const fixture of fixtures) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
          sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1');
          window.shareCalls = []; window.copyCalls = []; window.shareError = ''; window.copyError = false;
          Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
            window.shareCalls.push(data);
            if (window.shareError) throw new DOMException('Test share failure', window.shareError);
          } });
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
            if (window.copyError) throw new DOMException('Test clipboard failure', 'NotAllowedError');
            window.copyCalls.push(text);
          } } });
        });
        await page.route('https://tally.so/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Original submitted details</h1>' }));
        const region = fixture.country === 'DM' ? 'dominica' : 'antigua';
        const url = `${origin}/${region}/submission/${fixture.token}`;
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        const actions = page.getByRole('region', { name: 'Questions about your quote?' });
        await actions.waitFor();
        await page.evaluate(() => document.fonts.ready);
        const whatsapp = await actions.getByRole('link', { name: /Discuss on WhatsApp/ }).getAttribute('href');
        assert.ok(new URL(whatsapp).searchParams.get('text').endsWith(`Submission ID: ${fixture.submission_id}`));
        assert.equal(await page.getByText('ALL STEPS COMPLETE', { exact: true }).count(), 0);
        assert.equal(await page.getByRole('list', { name: 'Submission progress' }).count(), 0);
        const sidebar = page.getByRole('complementary', { name: 'Contact and submission details' });
        assert.equal(await sidebar.getByRole('region', { name: 'Questions about your quote?' }).count(), 1);
        const contactBox = await actions.boundingBox();
        const quoteBox = await page.locator('#estimate-title').boundingBox();
        assert.ok(contactBox.x + contactBox.width <= quoteBox.x, 'contact is on the left of the quote');
        for (const [alt, destination, label] of [['Scan to discuss this quote on WhatsApp', whatsapp, 'Chat on WhatsApp'], ['Scan to view this quote on your phone', url, 'Open this quote']]) {
          const thumbnail = actions.getByAltText(alt);
          const smallBox = await thumbnail.boundingBox();
          assert.equal(smallBox.width, 124, 'desktop QR stays compact');
          const decode = async image => {
            await image.evaluate(element => element.decode());
            const png = await image.screenshot();
            const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
            assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, destination);
          };
          const thumbnailSrc = await thumbnail.getAttribute('src');
          const enlarge = actions.getByRole('button', { name: `Enlarge QR code: ${label}` });
          await enlarge.click();
          const zoom = page.getByRole('dialog', { name: label, exact: true });
          await zoom.waitFor();
          const expanded = zoom.getByAltText(alt);
          assert.equal((await expanded.boundingBox()).width, 320);
          assert.equal(await expanded.getAttribute('src'), thumbnailSrc, 'zoom uses the same QR as its thumbnail');
          await decode(expanded);
          assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
          await page.keyboard.press('Tab');
          assert.equal(await zoom.evaluate(el => document.activeElement === document.body || el.contains(document.activeElement)), true, 'Tab does not focus background controls');
          if (fixture.label === 'AG' && name === 'chromium' && label === 'Chat on WhatsApp') {
            await page.screenshot({ path: path.join(output, 'submission-qr-expanded.png') });
          }
          await page.keyboard.press('Escape');
          await zoom.waitFor({ state: 'hidden' });
          assert.equal(await enlarge.evaluate(el => el === document.activeElement), true, 'closing restores focus to the QR');
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
          await enlarge.click();
          await zoom.getByRole('button', { name: 'Close QR code' }).click();
          await zoom.waitFor({ state: 'hidden' });
          await enlarge.click();
          await page.mouse.click(8, 8);
          await zoom.waitFor({ state: 'hidden' });
        }
        for (const href of await page.locator('footer a[href^="https://wa.me/"]').evaluateAll(links => links.map(link => link.href))) assert.equal(href, whatsapp);
        const footerPng = await page.locator('footer figure img').screenshot();
        const footerPixels = await sharp(footerPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.equal(jsQR(new Uint8ClampedArray(footerPixels.data), footerPixels.info.width, footerPixels.info.height)?.data, whatsapp, 'small footer QR remains scannable with its logo');
        if (fixture.label === 'AG' && name === 'chromium') {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(output, 'submission-desktop.png') });
        }

        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          assert.equal(await actions.getByRole('button', { name: /Enlarge QR code/ }).count(), 0, 'mobile uses sharing instead of QR');
          assert.equal(await actions.getByRole('img').count(), 0, 'no accessible mobile QR images');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        const share = actions.getByRole('button', { name: 'Share quote', exact: true });
        await share.click();
        await page.waitForFunction(() => window.shareCalls.length === 1);
        assert.equal(await page.evaluate(() => window.shareCalls[0].url), url);
        assert.equal(await page.evaluate(() => window.copyCalls.length), 0);

        await page.evaluate(() => { window.shareError = 'AbortError'; });
        await share.click();
        await page.waitForFunction(() => window.shareCalls.length === 2);
        assert.equal(await page.evaluate(() => window.copyCalls.length), 0, 'cancel must not copy or claim success');
        assert.equal(await actions.locator('[role="status"]').textContent(), '');

        await page.evaluate(() => { window.shareError = 'NotAllowedError'; });
        await share.click();
        await page.waitForFunction(() => window.copyCalls.length === 1);
        assert.equal(await page.evaluate(() => window.copyCalls[0]), url);
        await actions.getByText('Link copied. You can paste it into a message.').waitFor();

        await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined }); });
        await share.click();
        await page.waitForFunction(() => window.copyCalls.length === 2);
        await page.evaluate(() => { window.copyError = true; });
        await share.click();
        assert.equal(await actions.getByRole('textbox', { name: 'Quote link' }).inputValue(), url);
        // Native sharing remains available after a clipboard failure.
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'share', { value: async data => window.shareCalls.push(data) });
        });
        await share.click();
        await page.waitForFunction(() => window.shareCalls.length === 4);
        assert.equal(await actions.getByRole('textbox').count(), 0);

        const launcher = page.getByRole('button', { name: 'Chat on WhatsApp', exact: true });
        await launcher.click();
        const dialog = page.getByRole('dialog', { name: 'Let’s discuss your quote.' });
        assert.equal(await dialog.getByRole('link', { name: /Chat on WhatsApp/ }).getAttribute('href'), whatsapp);
        assert.equal(await dialog.getByRole('img').count(), 0, 'floating contact also hides QR on mobile');
        await dialog.getByRole('button', { name: 'Close contact options' }).click();
        if (fixture.label === 'AG' && name === 'chromium') {
          await actions.scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, 'submission-mobile.png') });
        }
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`PASS ${name} ${fixture.label}: left contacts, compact QR, scannable zoom with dismissal/focus, mobile sharing, cancellation, clipboard recovery and contextual contacts`);
      }
      const generic = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await generic.goto(`${origin}/antigua/faq`, { waitUntil: 'domcontentloaded' });
      assert.equal(await generic.locator('footer').getByRole('link', { name: /Chat on WhatsApp/ }).getAttribute('href'), 'https://wa.me/8617605886812', 'ordinary pages keep the general contact link');
      await generic.close();
      const landscape = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
      await landscape.route('https://tally.so/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Original submitted details</h1>' }));
      await landscape.goto(`${origin}/antigua/submission/${fixtures[0].token}`, { waitUntil: 'domcontentloaded' });
      const contact = landscape.getByRole('region', { name: 'Questions about your quote?' });
      await contact.waitFor();
      assert.equal(await contact.getByRole('button', { name: /Enlarge QR code/ }).count(), 0, 'landscape phone also uses sharing');
      assert.equal(await landscape.locator('footer').getByRole('button', { name: 'Scan QR code' }).count(), 0);
      await landscape.close();
      console.log(`PASS ${name}: ordinary contact links and landscape mobile`);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
