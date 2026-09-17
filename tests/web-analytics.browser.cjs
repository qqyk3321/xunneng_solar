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
    // Keep the existing database logger isolated from analytics verification.
    await page.route('**/solar-analysis/visit', route => route.fulfill({ status: 204 }));
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

    if (process.env.SOLAR_ANALYTICS_TEST_PASSWORD) {
      failScript = false;
      await page.goto(origin + '/solar-analysis');
      await idle();
      const loadsBeforeUnlock = scriptLoads;
      await page.locator('#solar-password').fill('intentionally-wrong');
      await page.getByRole('button', {name: '进入分析页面', exact: true}).click();
      await page.waitForURL(origin + '/solar-analysis?error=invalid_password');
      await page.getByRole('alert').first().waitFor();
      await idle();
      assert.equal(scriptLoads, loadsBeforeUnlock, 'lock/error screen never injects analytics');
      await count(9);
      // Allow the preceding Server Action's form reset to finish.
      await page.waitForTimeout(500);
      await page.locator('#solar-password').fill(process.env.SOLAR_ANALYTICS_TEST_PASSWORD);
      await page.getByRole('button', {name: '进入分析页面', exact: true}).click();
      await page.getByRole('heading', {name: '光伏与储能系统分析', exact: true}).waitFor();
      await idle();
      await count(10);
      assert.equal(events.at(-1).url, origin + '/solar-analysis');
      await page.getByRole('button', {name: '夜间用电', exact: true}).click();
      await page.getByRole('button', {name: '6月', exact: true}).click();
      await page.waitForTimeout(250);
      await count(10);
      // A retained SDK callback must re-check authorization, not capture true.
      await page.evaluate(() => {
        const marker = document.querySelector('[data-solar-analytics="authorized"]');
        marker.dataset.solarAnalytics = 'locked';
        window.va('pageview', {path: '/solar-analysis'});
        marker.dataset.solarAnalytics = 'authorized';
      });
      await page.waitForTimeout(200);
      await count(10);
      await page.reload();
      await idle();
      await count(11);
      await page.getByRole('link', {name: '返回首页', exact: true}).click();
      await page.waitForURL(origin + '/');
      await idle();
      await count(12);
      await page.goBack();
      await idle();
      await count(13);
      failScript = true;
      await page.reload();
      await idle();
      await page.getByRole('button', {name: '白天用电', exact: true}).click();
      assert.equal(await page.getByRole('button', {name: '白天用电', exact: true}).getAttribute('aria-pressed'), 'true');
      await count(13);
      failScript = false;
      await context.clearCookies();
      await page.reload();
      await page.locator('#solar-password').waitFor();
      await idle();
      await count(13);
      assert.equal(await page.locator('[data-solar-analytics="authorized"]').count(), 0);
      console.log('PASS solar: password/error omitted; successful login, valid-cookie refresh and return counted once; parameter changes omitted; stale callback denied; script failure never blocks analysis; expired session omitted.');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: six allowed paths; excluded direct/SPA routes; query redaction; reload and return; blocked tracking never blocks navigation. No real analytics sent.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
