// UI-only regression: all Contact API submissions are intercepted, no database writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const route of ['/antigua', '/dominica/faq']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
      let requests = 0;
      await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
      await page.route('**/api/contact', r => {
        requests++;
        return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ reference: '12345678-1234-4234-8234-123456789abc', receivedAt: new Date().toISOString() }) });
      });
      await page.goto((process.env.REGION_TEST_ORIGIN || 'http://127.0.0.1:3003') + route, { waitUntil: 'networkidle' });
      await page.locator(route.endsWith('/faq') ? '#ask-question' : '#contact-us').scrollIntoViewIfNeeded();
      const form = page.getByRole('form', { name: route.endsWith('/faq') ? 'Ask a question' : 'Contact us', exact: true });
      assert.equal(await form.locator('..').getByText(/Installation location:/).count(), 0);
      await form.locator('#contact-email').fill('privacy-test@example.com');
      await form.locator('#contact-message').fill('Please help me choose solar for my home.');
      await form.getByRole('button', { name: 'Send message', exact: true }).click();
      await page.locator('#contact-privacy-error').waitFor();
      assert.equal(requests, 0);
      assert.equal(await page.locator('#contact-privacy').evaluate(el => el === document.activeElement), true);
      assert.equal(await form.getByRole('link', { name: 'Privacy policy', exact: true }).getAttribute('href'), '/privacy');
      await page.locator('#contact-privacy').check();
      await form.getByRole('button', { name: 'Add photos', exact: true }).click();
      const dialog = page.locator('dialog[open]');
      assert.equal(await dialog.getByText(/Photos are compressed|Tell us what’s on your mind|Up to 3 photos/).count(), 0);
      assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false);
      await dialog.screenshot({ path: `/tmp/contact-simplified-${route.startsWith('/antigua') ? 'ag' : 'dm'}.png` });
      assert.equal(await dialog.locator('#contact-modal-privacy').isChecked(), true);
      await dialog.locator('#contact-modal-privacy').uncheck();
      await dialog.getByRole('button', { name: 'Send message', exact: true }).click();
      await dialog.locator('#contact-modal-privacy-error').waitFor();
      assert.equal(requests, 0);
      await dialog.locator('#contact-modal-privacy').check();
      await dialog.getByRole('button', { name: 'Send message', exact: true }).click();
      await dialog.getByRole('heading', { name: 'We’ve received your request.' }).waitFor();
      assert.equal(requests, 1);
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await page.getByRole('button', { name: 'Send another message' }).click();
      assert.equal(await page.locator('#contact-privacy').isChecked(), false);
      await form.locator('#contact-email').fill('privacy-test@example.com');
      await form.locator('#contact-message').fill('Another plain text question about solar.');
      await page.locator('#contact-privacy').check();
      await form.getByRole('button', { name: 'Send message', exact: true }).click();
      await page.getByRole('heading', { name: 'We’ve received your request.' }).waitFor();
      assert.equal(requests, 2);
      console.log('PASS privacy checkbox, reminder, no request before acceptance, shared modal state and reset:', route);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
