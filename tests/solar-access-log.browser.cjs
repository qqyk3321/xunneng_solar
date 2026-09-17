// Browser checks intercept every logging POST; no live database writes.
// Run via: node --conditions=react-server --import tsx tests/solar-access-log.browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { accessCookieValue, SOLAR_ACCESS_COOKIE } = require('../app/solar-analysis/access.ts');
const assert = require('node:assert/strict');
const origin = process.env.SOLAR_LOG_TEST_ORIGIN || 'http://127.0.0.1:3003';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('https://**/*', route => route.abort());
      await context.route('**/_next/image?**', route => route.abort());
      const page = await context.newPage();
      const attempts = [];
      const errors = [];
      let outcome = 'success';
      let release;
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/solar-analysis/visit', async route => {
        const req = route.request();
        attempts.push({ body: req.postDataJSON(), cookie: req.headers().cookie || '' });
        if (outcome === 'offline') return route.abort();
        if (outcome === 'pending') await new Promise(resolve => { release = resolve; });
        return route.fulfill({ status: outcome === 'error' ? 503 : 204 });
      });
      const idle = () => page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      const unlocked = async () => {
        try {
          await page.getByRole('heading', { name: '光伏与储能系统分析', exact: true }).waitFor();
        } catch (error) {
          console.error('Unlock diagnostics', { width, url: page.url(), errors, alert: await page.getByRole('alert').allTextContents(), hasAccessCookie: (await context.cookies()).some(cookie => cookie.name === SOLAR_ACCESS_COOKIE) });
          throw error;
        }
        await idle();
        const confirm = page.getByRole('button', { name: '确认安装条件，开始分析' });
        if (await confirm.isVisible()) await confirm.click();
        await page.locator('#solar-step-config').waitFor();
      };
      const count = async n => {
        await page.waitForFunction(() => true);
        const deadline = Date.now() + 10000;
        while (attempts.length < n && Date.now() < deadline) await page.waitForTimeout(50);
        assert.equal(attempts.length, n);
      };
      await page.goto(origin + '/solar-analysis', { waitUntil: 'domcontentloaded' });
      await idle();
      await page.locator('#solar-password').fill('deliberately-incorrect-test-password');
      await page.getByRole('button', { name: '进入分析页面', exact: true }).click();
      await page.getByRole('alert').waitFor();
      await page.waitForURL(origin + '/solar-analysis?error=invalid_password');
      await idle();
      assert.equal(attempts.length, 0, 'lock screen and invalid password do not log');
      if (process.env.SOLAR_LOG_TEST_PASSWORD) {
        // Wait for the preceding Server Action's form reset/commit before
        // entering a second password, rather than racing the error render.
        await page.waitForTimeout(500);
        await page.locator('#solar-password').fill(process.env.SOLAR_LOG_TEST_PASSWORD);
        const submitted = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname === '/solar-analysis');
        await page.getByRole('button', { name: '进入分析页面', exact: true }).click();
        assert.ok((await submitted).postData()?.includes(process.env.SOLAR_LOG_TEST_PASSWORD), 'correct fixture password submitted after form reset');
      } else {
        await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict', secure: origin.startsWith('https:') }]);
        await page.goto(origin + '/solar-analysis', { waitUntil: 'domcontentloaded' });
      }
      await unlocked();
      await count(1);
      assert.ok(attempts[0].cookie.includes(SOLAR_ACCESS_COOKIE + '='), 'cookie Path includes logging endpoint');
      await page.getByRole('button', { name: '夜间用电', exact: true }).click();
      await page.getByRole('button', { name: '6月', exact: true }).click();
      await page.locator('#solar-step-config input[type="number"]').first().fill('650');
      await page.waitForTimeout(400);
      assert.equal(attempts.length, 1, 'parameter updates/Strict Mode replay do not log again');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await unlocked();
      await count(2);
      assert.notEqual(attempts[0].body.id, attempts[1].body.id);
      await page.getByRole('link', { name: '返回首页', exact: true }).click();
      await page.waitForURL(origin + '/');
      await idle();
      assert.equal(attempts.length, 2, 'other pages never log solar visits');
      await page.goBack();
      await unlocked();
      await count(3);
      // Exercise the BFCache restoration handler; ordinary pageshow is ignored.
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })));
      assert.equal(attempts.length, 3);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      await count(4);
      for (const failure of ['error', 'offline']) {
        outcome = failure;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await unlocked();
        const expected = failure === 'error' ? 5 : 6;
        await count(expected);
        await page.getByRole('button', { name: '白天用电', exact: true }).click();
        await page.waitForTimeout(500);
        assert.equal(attempts.length, expected, 'logging failure is not retried');
      }
      outcome = 'pending';
      await page.reload({ waitUntil: 'domcontentloaded' });
      await unlocked();
      await count(7);
      await page.getByRole('button', { name: '夜间用电', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: '夜间用电', exact: true }).getAttribute('aria-pressed'), 'true', 'pending log must not block interaction');
      release();
      await page.waitForTimeout(300);
      assert.equal(attempts.length, 7);
      assert.equal(new Set(attempts.map(x => x.body.id)).size, 7);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}: unauthorized omitted; existing session, reload, return, BFCache event each log once; changes do not log; errors/offline/pending never block or retry`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
