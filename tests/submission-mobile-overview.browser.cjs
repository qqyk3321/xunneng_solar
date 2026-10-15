// Layout and contact regression; all browser writes and external form loads are blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.PREVIEW_TEST_ORIGIN || 'http://127.0.0.1:3192';
const local = new URL(origin).hostname === '127.0.0.1';
const route = process.env.PREVIEW_TEST_PATH || '/antigua/submission/' + 'cleanup-fixture-compact-'.padEnd(43, 'x');
const output = process.env.OVERVIEW_ARTIFACTS;
const expectedQuoteUrl = new URL(route, process.env.PREVIEW_SHARE_ORIGIN || 'https://www.solortide.com').href;

(async () => {
  if (output) fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1');
      window.copiedQuote = '';
      window.copyFails = false;
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
        if (window.copyFails) throw new DOMException('Test denial', 'NotAllowedError');
        window.copiedQuote = text;
      } } });
    });
    await context.route('**/*', request => {
      const req = request.request(), url = new URL(req.url());
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return request.abort();
      if (url.hostname.endsWith('tally.so')) return request.fulfill({ contentType: 'text/html', body: '<p>Submitted consultation preview</p>' });
      return request.continue(process.env.PREVIEW_TEST_BYPASS && url.origin === origin
        ? { headers: { ...req.headers(), 'x-vercel-protection-bypass': process.env.PREVIEW_TEST_BYPASS } } : {});
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const go = async path => {
      assert.equal((await page.goto(origin + path, { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.evaluate(() => document.fonts.ready);
    };
    await go(route);
    const quote = page.getByTestId('preview-estimate');
    await quote.waitFor();
    const contact = page.getByRole('region', { name: 'Questions about your quote?' });
    const launcher = page.getByRole('button', { name: 'Chat on WhatsApp', exact: true });
    const positions = [];
    const initialText = await quote.innerText();
    for (const [width, height] of [[320,568], [360,640], [375,667], [390,664], [390,844], [430,932], [600,800], [601,900], [768,1024], [960,1000], [961,1000], [1440,1000]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const layout = await page.evaluate(() => {
        const rect = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, height:r.height, width:r.width }; };
        const estimate = document.querySelector('[data-testid="preview-estimate"]');
        const tile = [...estimate.querySelectorAll('dl > div')].map(el => {
          const dd = el.querySelector('dd'), amount = el.querySelector('[class*="metricAmount"]');
          return { ...rect(el), textClipped:dd.scrollWidth > dd.clientWidth, amount:rect(amount), background:getComputedStyle(el).backgroundColor, gradient:getComputedStyle(el).backgroundImage };
        });
        const summary = document.querySelector('[aria-labelledby="preview-title"]');
        return { tile, header:rect(document.querySelector('[data-testid="home-header"]')), quote:rect(estimate), summary:rect(summary), fields:[...summary.querySelectorAll('dl > div')].map(rect), contact:rect(document.querySelector('[aria-labelledby="quote-contact-title"]')), buttons:[...document.querySelectorAll('[aria-labelledby="quote-contact-title"] a, [aria-labelledby="quote-contact-title"] button')].filter(el=>el.getClientRects().length).map(rect), overflow:document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(layout.overflow, false);
      assert.equal(await quote.innerText(), initialText, 'layout changes preserve all estimate text');
      for (const tile of layout.tile) {
        assert.equal(tile.textClipped, false, `${width}: metric fits`);
        assert.equal(tile.background, 'rgb(238, 242, 240)');
        assert.equal(tile.gradient, 'none');
        assert(tile.amount.x >= tile.x && tile.amount.right <= tile.right);
        assert(tile.amount.y >= tile.y && tile.amount.bottom <= tile.bottom, 'amount remains inside its card');
      }
      const amountStyles = await quote.evaluate(el => [...el.querySelectorAll('[class*="metricValue"]')].map(n => getComputedStyle(n).color));
      assert.deepEqual(amountStyles, ['rgb(254, 166, 25)', 'rgb(51, 73, 70)', 'rgb(51, 73, 70)']);
      const fonts = await page.getByTestId('preview-quote').evaluate(el => [...el.querySelectorAll('[class*="metricCurrency"], [class*="metricValue"]')].map(n=>getComputedStyle(n).fontSize));
      assert.equal(fonts[0], fonts[1]);
      if (width <= 600) {
        assert(layout.quote.y > layout.header.bottom, 'header clears the quote');
        assert.equal(layout.tile[1].y, layout.tile[2].y, 'secondary metrics share one row');
        assert(layout.tile[0].bottom < layout.tile[1].y);
        assert(layout.summary.bottom <= height - 4, `${width}×${height}: all non-Tally information fits one screen (${layout.summary.bottom})`);
        assert.equal(layout.buttons.length, 2);
        assert.equal(layout.buttons[0].y, layout.buttons[1].y);
        for (const button of layout.buttons) assert(button.height >= 44);
        assert.equal(layout.fields[0].y, layout.fields[1].y);
        assert.equal(layout.fields[2].y, layout.fields[3].y);
        await launcher.waitFor({ state: 'hidden' });
      } else if (width > 960) {
        assert(layout.contact.right < layout.quote.x, 'original desktop sidebar');
        assert.equal(layout.quote.height, width === 1440 ? 313 : 388);
        await launcher.waitFor({ state: 'visible' });
      }
      if (output && [320,390,1440].includes(width)) await page.screenshot({ path:`${output}/overview-${width}-${height}.png`, style:'nextjs-portal{display:none}' });
      positions.push({ width, height, layout });
    }

    await page.setViewportSize({ width:390, height:664 });
    await page.evaluate(() => window.scrollTo({ top:0, behavior:'instant' }));
    await launcher.waitFor({ state:'hidden' });
    const whatsapp = await contact.getByRole('link', { name:'Discuss on WhatsApp' }).getAttribute('href');
    await contact.getByRole('button', { name:'Share quote', exact:true }).click();
    await contact.getByText('Link copied. You can paste it into a message.').waitFor();
    assert.equal(await page.evaluate(() => window.copiedQuote), expectedQuoteUrl);
    await page.evaluate(() => { window.copyFails = true; });
    await contact.getByRole('button', { name:'Share quote', exact:true }).click();
    assert.equal(await contact.getByRole('textbox', { name:'Quote link' }).inputValue(), expectedQuoteUrl);
    await go(route);
    await page.evaluate(() => window.scrollTo({ top:document.getElementById('submission-overview').getBoundingClientRect().bottom + window.scrollY + 10, behavior:'instant' }));
    await launcher.waitFor({ state:'visible' });
    await launcher.click();
    const dialog = page.getByRole('dialog', { name:'Let’s discuss your quote.', exact:true });
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('link', { name:/Chat on WhatsApp/ }).getAttribute('href'), whatsapp);
    await dialog.getByRole('button', { name:'Close contact options' }).click();
    await page.evaluate(() => window.scrollTo({ top:0, behavior:'instant' }));
    await launcher.waitFor({ state:'hidden' });
    await page.setViewportSize({ width:1440, height:1000 });
    await launcher.waitFor({ state:'visible' });
    await contact.getByRole('button', { name:'Enlarge QR code: Chat on WhatsApp' }).click();
    const qr = page.getByRole('dialog', { name:'Chat on WhatsApp', exact:true });
    await qr.waitFor();
    assert.equal((await qr.getByRole('img').boundingBox()).width, 320);
    await page.keyboard.press('Escape');
    await qr.waitFor({ state:'hidden' });
    if (local) {
      await page.setViewportSize({ width:390, height:664 });
      for (const label of ['AG','DM','legacy','large']) {
        await go(`/${label==='DM'?'dominica':'antigua'}/submission/` + `cleanup-fixture-${label}-`.padEnd(43,'x'));
        await page.getByTestId(label==='legacy'?'preview-estimate-unavailable':'preview-estimate').waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert((await page.locator('[aria-labelledby="preview-title"]').boundingBox()).y + (await page.locator('[aria-labelledby="preview-title"]').boundingBox()).height < 664);
        if (label === 'large') {
          for (const width of [320,390]) {
            await page.setViewportSize({ width,height:664 });
            assert.equal(await page.getByTestId('preview-estimate').locator('dd').evaluateAll(elements=>elements.some(el=>el.scrollWidth>el.clientWidth)), false, 'longer live-calculated amounts fit beside their units');
          }
        }
      }
    }
    assert.deepEqual(errors, []);
    if (output) fs.writeFileSync(`${output}/checks.json`, JSON.stringify({passed:true, positions, pageErrors:errors}, null, 2));
    console.log('PASS: mobile overview fits one screen at seven sizes; desktop retained; numeric styles, all details, 44px actions, sharing/recovery, floating contact after scrolling and QR enlargement; no overflow or client errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(String(error.stack || error).replace(/[A-Za-z0-9_-]{40,}/g,'[redacted]')); process.exitCode=1; });
