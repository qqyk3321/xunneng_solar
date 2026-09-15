// Only mock embeds: no questionnaire submission or backend writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      let embeds = 0;
      await page.route('https://tally.so/widgets/embed.js', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
      await page.route('https://tally.so/embed/**', r => { embeds++; return r.fulfill({ contentType: 'text/html', body: '<p>Mock questionnaire</p>' }); });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto((process.env.REGION_TEST_ORIGIN || 'http://127.0.0.1:3003') + '/dominica/consultation', { waitUntil: 'networkidle' });
      await page.clock.install();
      assert.equal(embeds, 0);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Continue to assessment' }).click();
      const loading = page.getByRole('heading', { name: 'Loading your assessment…' });
      await loading.waitFor();
      const element = page.getByTitle('Assessment details form');
      assert.equal(await element.getAttribute('data-pending'), 'true');
      await page.evaluate(() => window.postMessage(JSON.stringify({ event: 'Tally.FormLoaded', payload: { formId: '9q8RYQ' } }), '*'));
      assert.equal(await loading.isVisible(), true);
      await page.clock.runFor(12001);
      await page.getByRole('heading', { name: 'Taking a little longer…' }).waitFor();
      assert.equal(await element.getAttribute('data-pending'), null);
      assert.equal(new URL(await page.getByRole('link', { name: 'Open questionnaire separately' }).getAttribute('href')).searchParams.get('installation_country'), 'DM');
      await page.getByRole('button', { name: 'Reload questionnaire' }).click();
      await loading.waitFor();
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow !== null);
      const frame = page.frames().find(f => f.url().startsWith('https://tally.so/embed/'));
      assert.ok(frame);
      const ready = id => frame.evaluate(formId => parent.postMessage(JSON.stringify({ event: 'Tally.FormLoaded', payload: { formId } }), '*'), id);
      await ready('wrong');
      assert.equal(await loading.isVisible(), true);
      await ready('9q8RYQ');
      await loading.waitFor({ state: 'hidden' });
      assert.equal(await element.getAttribute('data-pending'), null);
      assert.equal(embeds, 2);
      await page.clock.runFor(13000);
      assert.equal(await page.getByRole('heading', { name: 'Taking a little longer…' }).count(), 0);
      assert.deepEqual(errors, []);
      console.log('PASS loading, slow connection, manual retry, trusted ready event and timer cleanup', width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
