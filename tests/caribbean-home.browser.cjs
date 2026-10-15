// Read-only checks against the user's existing local server. No submissions.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(60000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const idle = () => page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await idle();
      assert.equal(new URL(await page.locator('link[rel=canonical]').getAttribute('href')).pathname, '/');
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.equal(await page.locator('#calculator').count(), 0);
      assert.equal(await page.locator('h1').count(), 1);
      if (width < 800) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.locator('header').getByRole('button', { name: 'Savings', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
      await dialog.waitFor();
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await dialog.getByRole('button', { name: /Antigua/ }).getAttribute('aria-pressed'), null);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
      if (width < 800) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.locator('header').getByRole('button', { name: 'Savings', exact: true }).click();
      await dialog.getByRole('button', { name: /Dominica/ }).click();
      await page.waitForURL(`${origin}/dominica#calculator`, { waitUntil: 'domcontentloaded' });
      await idle();
      assert.equal(await page.locator('#calculator').count(), 1);
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await idle();
      for (let index = 0; index < 5; index++) {
        await page.locator(`#step-${index}`).scrollIntoViewIfNeeded();
        if (width >= 800) {
          await page.evaluate(index => {
            const node = document.getElementById(`step-${index}`);
            window.scrollBy(0, node.getBoundingClientRect().top - 200);
          }, index);
          await page.waitForFunction(index => document.querySelector('nav[aria-label="Service process steps"] a[aria-current]')?.getAttribute('href') === `#step-${index}`, index);
        } else {
          await page.waitForFunction(index => {
            const img = document.querySelector(`#step-${index} img`);
            return img?.complete && img.naturalWidth > 0;
          }, index);
        }
      }
      await page.getByRole('button', { name: 'Show next solar benefit' }).click();
      assert.ok(await page.getByRole('heading', { name: width < 701 ? 'Keep the essentials running.' : 'A reserve for what matters most.' }).isVisible());
      await page.getByRole('button', { name: 'Show next solar benefit' }).click();
      await page.getByRole('button', { name: 'Show next solar benefit' }).click();
      assert.ok(await page.getByRole('heading', { name: width < 701 ? 'Use more of your own solar.' : 'Make your sunshine go further.' }).isVisible());
      const hybridImages = await page.locator('#hybrid-system img').evaluateAll(images => images.map(image => image.getAttribute('src')));
      assert.equal(hybridImages.length, 3);
      assert.equal(new Set(hybridImages).size, 3);
      assert.ok(hybridImages.every(src => src.includes('hybrid-')));
      if (width < 701) await page.getByRole('button', { name: 'System controls & limits' }).click();
      assert.ok(await page.locator('#hybrid-system').innerText().then(text => text.includes('Time-of-use') && text.includes('local tariffs')));
      assert.equal(await page.locator('#standards-title').count(), 0);
      assert.equal(await page.getByRole('list', { name: 'Planned island locations', includeHidden: true }).count(), 1);
      const faqLink = page.getByRole('button', { name: 'Explore all FAQs' });
      await faqLink.click();
      await dialog.getByRole('button', { name: /Dominica/ }).click();
      await page.waitForURL(`${origin}/dominica/faq`, { waitUntil: 'domcontentloaded' });
      await idle();
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await idle();
      await page.locator('#questions summary').first().click();
      assert.equal(await page.locator('#questions details[open]').count(), 1);
      await page.locator('footer').getByRole('button', { name: /Get Your Free Assessment/ }).click();
      await dialog.waitFor();
      await page.waitForURL(`${origin}/antigua/consultation`, { waitUntil: 'domcontentloaded' });
      await idle();
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await idle();
      if (width < 800) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.locator('header').getByRole('button', { name: 'Get Your Free Assessment', exact: true }).click();
      await dialog.getByRole('button', { name: /Dominica/ }).click();
      await page.waitForURL(`${origin}/dominica/consultation`, { waitUntil: 'domcontentloaded' });
      await idle();
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await idle();
      assert.equal(await page.locator('header').getByRole('button', { name: 'Change installation location', exact: true }).count(), 0);
      await page.goto(`${origin}/antigua`, { waitUntil: 'domcontentloaded' });
      await idle();
      await page.locator('footer').getByRole('button', { name: 'Change installation location' }).click();
      await dialog.getByRole('button', { name: /Antigua/ }).click();
      assert.equal(page.url(), `${origin}/antigua`);
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await idle();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `/tmp/caribbean-home-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: neutral homepage, country routing, scroll story, carousel, FAQ, modal, no overflow/errors`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
