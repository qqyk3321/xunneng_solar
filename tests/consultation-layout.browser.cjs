// Loads the real public Tally embed; never fills or submits the questionnaire.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      if (process.env.REGION_BUILD_DIR) {
        await page.route('http://127.0.0.1:3003/**', route => {
          const url = new URL(route.request().url());
          const build = process.env.REGION_BUILD_DIR;
          const file = url.pathname.startsWith('/_next/static/')
            ? path.join(build, '.next', decodeURIComponent(url.pathname.slice('/_next/'.length)))
            : url.pathname === '/icon.svg' ? path.join(build, 'app/icon.svg')
            : /\.(svg|png|webp)$/.test(url.pathname) ? path.join(build, 'public', url.pathname)
            : path.join(build, '.next/server/app', url.pathname + '.html');
          if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
          const contentType = { '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.html': 'text/html', '.woff2': 'font/woff2' }[path.extname(file)];
          return route.fulfill({ path: file, contentType });
        });
      }
      await page.goto('http://127.0.0.1:3003/antigua/consultation', { waitUntil: 'networkidle' });
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Continue to assessment' }).click();
      await page.waitForFunction(() => {
        const iframe = document.querySelector('iframe');
        return iframe?.dataset.tallyEmbedWidgetInitialized === '1' && parseFloat(iframe.style.height) > 0;
      }, { }, { timeout: 60000 });
      await page.getByRole('heading', { name: 'Loading your assessment…' }).waitFor({ state: 'hidden' });
      const frame = page.frames().find(f => f.url().startsWith('https://tally.so/embed/'));
      assert.ok(frame);
      const dimensions = await frame.evaluate(() => ({ height: innerHeight, content: document.documentElement.scrollHeight }));
      assert.ok(dimensions.content <= dimensions.height + 4, JSON.stringify(dimensions));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('header img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)), true);
      await page.screenshot({ path: `/tmp/consultation-layout-${width}.png`, fullPage: true });
      console.log('PASS real Tally auto-height; no inner overflow', width, dimensions);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
