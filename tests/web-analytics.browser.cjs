// Run against an isolated build made with VERCEL_ENV=production.
// Uses an SDK protocol fixture, not Vercel's live collection service.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.ANALYTICS_TEST_ORIGIN || 'http://127.0.0.1:3197';
const script = `(() => {
  let beforeSend = () => null;
  const queue = window.vaq || [];
  window.va = (kind, data) => {
    if (kind === 'beforeSend') { beforeSend = data; return; }
    if (kind !== 'pageview') return;
    const event = beforeSend({type: 'pageview', url: new URL(data.path + location.search + location.hash, location.origin).href});
    if (event) fetch('/__analytics_test', {method: 'POST', body: JSON.stringify(event)}).catch(() => {});
  };
  queue.forEach(args => window.va(...args));
})();`;

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('https://**/*', route => route.abort());
    await context.route('**/_next/image?**', route => route.abort());
    const page = await context.newPage();
    const events = [];
    const errors = [];
    let scriptLoads = 0;
    let failScript = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/_vercel/insights/script.js', route => {
      scriptLoads++;
      return failScript ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: script });
    });
    await page.route('**/__analytics_test', route => {
      events.push(route.request().postDataJSON());
      return route.fulfill({ status: 204 });
    });
    const idle = async () => {
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      await page.waitForTimeout(250);
    };
    const count = async n => {
      for (let i = 0; i < 100 && events.length < n; i++) await page.waitForTimeout(50);
      assert.equal(events.length, n);
    };
    for (const path of ['/faq', '/privacy', '/solar-analysis', '/antigua/faq']) {
      await page.goto(origin + path);
      await idle();
      assert.equal(scriptLoads, 0, 'excluded direct entry does not load tracking script');
    }
    for (const path of ['/', '/antigua', '/dominica', '/consultation', '/antigua/consultation', '/dominica/consultation']) {
      const previous = events.length;
      await page.goto(origin + path + '?token=do-not-send#private');
      await idle();
      await count(previous + 1);
      assert.equal(events.at(-1).url, origin + path);
    }
    await page.goto(origin + '/antigua');
    await idle();
    await count(7);
    // Existing Next Link navigation, not a full document reload.
    await page.locator('a[href="/antigua/faq"]').first().evaluate(link => link.click());
    await page.waitForURL(origin + '/antigua/faq');
    await idle();
    await count(7);
    // beforeSend remains protective even when a script is already present.
    await page.evaluate(() => window.va('pageview', {path: '/antigua/submission/secret'}));
    await page.waitForTimeout(200);
    await count(7);
    await page.getByRole('link', {name: 'Sol & Tide Energy home', exact: true}).first().click();
    await page.waitForURL(origin + '/antigua');
    await idle();
    await count(8);
    await page.reload();
    await idle();
    await count(9);
    failScript = true;
    await page.goto(origin + '/antigua');
    await idle();
    await page.locator('a[href="/antigua/faq"]').first().evaluate(link => link.click());
    await page.waitForURL(origin + '/antigua/faq');
    await idle();
    assert.equal(events.length, 9, 'blocked analytics does not prevent navigation');
    assert.deepEqual(errors, []);
    console.log('PASS: six allowed paths; excluded direct/SPA routes; query redaction; reload and return; blocked tracking never blocks navigation. No real analytics sent.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
