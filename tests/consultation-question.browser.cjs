// All submissions are intercepted. No real questions, emails or database writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [region, code] of [['antigua', 'AG'], ['dominica', 'DM']]) {
      for (const width of [390, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        const requests = [];
        await page.route('**/api/contact', r => {
          requests.push(r.request().postData());
          return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ reference: '12345678-1234-4234-8234-123456789abc', receivedAt: new Date().toISOString() }) });
        });
        await page.goto(`http://127.0.0.1:3003/${region}/consultation`, { waitUntil: 'networkidle' });
        const launcher = page.getByRole('button', { name: 'Chat on WhatsApp', exact: true });
        const dialog = page.locator('dialog[open]');
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.includes('Chat on WhatsApp') && !el.disabled));
        await launcher.hover();
        await launcher.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
        assert.equal(await dialog.count(), 0);
        const box = await launcher.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 90, box.y - 100, { steps: 12 });
        await page.mouse.up();
        assert.equal(await dialog.count(), 0, 'Dragging must not open the dialog');
        const moved = await launcher.boundingBox();
        assert.ok(moved.y < box.y - 50);
        await launcher.click();
        await dialog.waitFor();
        await dialog.locator('#contact-modal-email').fill('test@example.com');
        const editor = dialog.getByRole('textbox', { name: 'Your message', exact: true });
        await editor.fill('Please explain which equipment is suitable for my home.');
        await dialog.getByRole('button', { name: 'Keep draft & close' }).click();
        await dialog.waitFor({ state: 'hidden' });
        await launcher.focus();
        await page.keyboard.press('Enter');
        await dialog.waitFor();
        assert.match(await editor.innerText(), /suitable for my home/);
        await dialog.getByRole('button', { name: 'Send message', exact: true }).click();
        await dialog.locator('#contact-modal-privacy-error').waitFor();
        assert.equal(requests.length, 0);
        await dialog.locator('#contact-modal-privacy').check();
        await dialog.screenshot({ path: `/tmp/consultation-question-${region}-${width}.png`, animations: 'disabled' });
        await dialog.getByRole('button', { name: 'Send message', exact: true }).click();
        await dialog.getByRole('heading', { name: 'We’ve received your request.' }).waitFor();
        assert.equal(requests.length, 1);
        assert.match(requests[0], new RegExp(`name="country_code"\\r\\n\\r\\n${code}`));
        await dialog.getByRole('button', { name: 'Done', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await page.getByRole('button', { name: 'Continue to assessment' }).count(), 1);
        await launcher.click();
        await dialog.waitFor();
        assert.equal((await editor.innerText()).trim(), '');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await launcher.evaluate(el => document.activeElement === el), true);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await launcher.click();
        await dialog.waitFor();
        assert.equal(await dialog.evaluate(el => getComputedStyle(el).animationName), 'none');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        console.log('PASS floating question: hover, drag, click, keyboard, draft, consent, regional submission, reset', region, width);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
