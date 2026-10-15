const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('https://tally.so/**', r => r.fulfill({ contentType: 'text/html', body: '<p>Mock form</p>' }));
    await page.goto('http://127.0.0.1:3003/antigua/consultation', { waitUntil: 'networkidle' });
    assert.equal(await page.getByText(/An assessment is a starting point/).count(), 0);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continue to assessment' }).click();
    await page.locator('iframe').waitFor();
    let confirmations = 0;
    page.on('dialog', async dialog => { confirmations++; await dialog.dismiss(); });
    await page.getByRole('link', { name: /Back to home/ }).click();
    assert.equal(confirmations, 1);
    assert.match(page.url(), /consultation/);
    await page.reload({ timeout: 3000 }).catch(() => {});
    assert.equal(confirmations, 2);
    assert.equal(await page.locator('iframe').count(), 1);
    const frame = page.frames().find(frame => frame.url().startsWith('https://tally.so/embed/'));
    await frame.evaluate(() => parent.postMessage(JSON.stringify({ event: 'Tally.FormSubmitted', payload: { formId: '9q8RYQ' } }), '*'));
    await page.getByRole('heading', { name: 'SUBMISSION COMPLETE', exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(confirmations, 2);
    console.log('PASS leaving link and refresh warnings, cancel preserves form, completed form releases guard');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
