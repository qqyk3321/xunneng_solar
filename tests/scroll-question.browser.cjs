// Navigation-only test. Never submits a question or questionnaire.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      for (const region of ['antigua', 'dominica']) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`http://127.0.0.1:3003/${region}`, { waitUntil: 'networkidle' });
        const launcher = page.getByRole('button', { name: 'Chat on WhatsApp', exact: true });
        await page.waitForFunction(() => {
          const input = document.getElementById('contact-email');
          return input && !input.matches(':disabled');
        });
        assert.equal(await launcher.count(), 0, 'No launcher over the hero at the top');
        await page.evaluate(() => window.scrollTo(0, 350));
        await page.locator('[data-cookie-notice]').waitFor({ timeout: 12000 });
        await launcher.waitFor({ state: 'hidden' });
        await page.getByRole('button', { name: 'Accept all', exact: true }).click();
        await launcher.waitFor();
        assert.equal(await launcher.getAttribute('aria-haspopup'), null);
        await launcher.click();
        await page.waitForFunction(() => document.getElementById('contact-us').getBoundingClientRect().top < 180);
        assert.equal(await page.locator('dialog[open]').count(), 0);
        await launcher.waitFor({ state: 'hidden' });
        await page.goto(`http://127.0.0.1:3003/${region}/faq`, { waitUntil: 'networkidle' });
        await launcher.waitFor();
        assert.equal(await page.evaluate(() => window.scrollY), 0, 'FAQ launcher is visible without scrolling');
        await launcher.click();
        await page.waitForFunction(() => document.getElementById('ask-question').getBoundingClientRect().top < 180);
        assert.equal(await page.locator('dialog[open]').count(), 0);
        // Footer may reopen the cookie notice on FAQ as well.
        await page.getByRole('button', { name: 'Cookie preferences', exact: true }).click();
        await page.locator('[data-cookie-notice]').waitFor();
        await page.evaluate(() => window.scrollTo(0, 260));
        await launcher.waitFor({ state: 'hidden' });
        console.log('PASS scroll shortcut, cookie exclusion, homepage + FAQ', region, width);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
