// Read-only: verifies an existing unexpired preview. No submissions or DB writes.
// Run with node --env-file=.env; never log the private URL, token or email.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { createClient } = require('@supabase/supabase-js');
const { createHash, createHmac } = require('node:crypto');
const assert = require('node:assert/strict');
(async () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(process.env.SUPABASE_URL, key);
  const {data, error} = await client.from('consultation_preview_tokens').select('token_hash,tally_submission_row_id,tally_form_submissions(country_code,email,preview_url:payload->data->>submissionPreviewUrl)').gt('expires_at',new Date().toISOString()).limit(1);
  assert.equal(error, null);
  assert.ok(data?.length, 'Requires an existing valid preview');
  const row = data[0], submission = row.tally_form_submissions;
  const token = createHmac('sha256', key).update(`consultation-preview/${row.tally_submission_row_id}`).digest('base64url');
  assert.ok(createHash('sha256').update(token).digest('hex') === row.token_hash, 'Existing preview must match current signing key');
  const region = submission.country_code === 'AG' ? 'antigua' : 'dominica';
  const expectedUrl = new URL(submission.preview_url);
  expectedUrl.searchParams.set('dynamicHeight', '1');
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route(expectedUrl.href, async route => { await gate; await route.continue(); });
      await page.goto(`http://127.0.0.1:3003/${region}/submission/${token}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Loading your consultation…' }).waitFor();
      assert.equal(await page.locator('header').count(), 1);
      assert.equal(await page.locator('footer').count(), 1);
      const frame = page.getByTitle('Consultation record preview');
      assert.ok(await frame.getAttribute('src') === expectedUrl.href);
      release();
      await page.waitForFunction(() => document.querySelector('iframe')?.dataset.tallyEmbedWidgetInitialized === '1');
      assert.equal(await frame.getAttribute('scrolling'), 'auto');
      await page.getByRole('heading', { name: 'Loading your consultation…' }).waitFor({ state: 'hidden', timeout: 60000 });
      const embedded = page.frames().find(f => f.url().startsWith('https://tally.so/'));
      assert.ok(embedded);
      await embedded.waitForFunction(() => document.body.innerText.trim().length > 100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('button', { name: 'Ask a question', exact: true }).click();
      const dialog = page.locator('dialog[open]');
      await dialog.waitFor();
      assert.ok(await dialog.locator('#contact-modal-email').inputValue() === submission.email);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      console.log('PASS Tally preview, loading, header/footer, prefilled email, no horizontal overflow', width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(() => { console.error('Preview verification failed (private details suppressed).'); process.exitCode = 1; });
