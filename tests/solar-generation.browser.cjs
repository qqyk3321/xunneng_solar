// All access-log writes are intercepted. No third-party API requests are needed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { accessCookieValue, SOLAR_ACCESS_COOKIE } = require('../app/solar-analysis/access.ts');
const assert = require('node:assert/strict');
const { mkdtemp } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const origin = process.env.SOLAR_LOG_TEST_ORIGIN || 'http://127.0.0.1:3003';
(async () => {
  const browser = await chromium.launch();
  const artifacts = await mkdtemp(join(tmpdir(), 'solar-generation-ui-'));
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('**/solar-analysis/visit', route => route.fulfill({ status: 204 }));
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', r => requests.push(r.url()));
    await page.goto(origin + '/solar-analysis');
    await page.locator('#solar-password').waitFor();
    assert.equal(await page.locator('#solar-step-installation').count(), 0);
    assert.equal((await context.request.get(origin + '/solar-analysis/model?id=hoymiles')).status(), 401);
    await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict' }]);
    await page.reload();
    await page.locator('#solar-step-installation').waitFor();
    assert.equal(await page.locator('#solar-step-config').count(), 0);
    assert.equal(requests.filter(u => u.includes('/solar-analysis/model?')).length, 0);
    await page.getByRole('button', { name: '使用教程', exact: true }).click();
    await page.getByRole('heading', { name: '选择数据源与安装条件', exact: true }).waitFor();
    assert.match(await page.locator('.tour-progress').innerText(), /STEP 1 \/ 6/);
    assert.equal(await page.locator('#solar-step-installation.tour-target').count(), 1);
    await page.getByRole('button', { name: '倾角 20°', exact: true }).click();
    await page.getByRole('button', { name: '朝向 东', exact: true }).click();
    assert.match(await page.getByTestId('installation-summary').innerText(), /朝东 · 20°/);
    await page.getByRole('button', { name: '确认条件并继续', exact: true }).click();
    await page.locator('#solar-step-config').waitFor();
    assert.match(await page.locator('.tour-progress').innerText(), /STEP 2 \/ 6/);
    for (const target of ['solar-step-profile', 'solar-step-hourly', 'solar-step-monthly', 'solar-step-key-metrics']) {
      await page.getByRole('button', { name: '下一步', exact: true }).click();
      await page.locator(`#${target}.tour-target`).waitFor();
    }
    await page.getByRole('button', { name: '完成', exact: true }).click();
    const total = () => page.locator('.v2-summary article').first().locator('strong').innerText();
    const before = await total();
    await page.getByRole('button', { name: '朝向 西', exact: true }).click();
    await page.waitForFunction(previous => document.querySelector('.v2-summary article strong')?.textContent && document.querySelector('.v2-summary article strong').textContent !== previous, before);
    const west = await total();
    await page.getByLabel('参考地区', { exact: true }).selectOption('dominica');
    await page.waitForFunction(previous => document.querySelector('.v2-summary article strong')?.textContent && document.querySelector('.v2-summary article strong').textContent !== previous, west);
    await page.getByRole('button', { name: '倾角 0° 水平放置', exact: true }).click();
    await page.locator('#solar-step-config').waitFor();
    for (const direction of ['东', '南', '西', '北']) assert.equal(await page.getByRole('button', { name: `朝向 ${direction}`, exact: true }).isDisabled(), true);
    await page.getByLabel('安装方式', { exact: true }).selectOption('open-rack');
    await page.locator('#solar-step-config').waitFor();
    assert.match(await page.getByTestId('installation-summary').innerText(), /水平 0°.*通风支架/);
    await page.getByRole('button', { name: '倾角 15°', exact: true }).click();
    assert.equal(await page.getByLabel('安装方式', { exact: true }).inputValue(), 'roof');
    await page.locator('#solar-step-config').waitFor();
    const annualBeforeMonth = await total();
    await page.getByRole('button', { name: '6月', exact: true }).click();
    assert.equal(await total(), annualBeforeMonth);
    await page.getByRole('button', { name: '夜间用电', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '夜间用电', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByLabel('发电数据源', { exact: true }).selectOption('hoymiles');
    await page.locator('#solar-step-config').waitFor();
    assert.equal(await page.getByRole('button', { name: '倾角 15°', exact: true }).count(), 0);
    assert.equal(await page.getByLabel('参考地区', { exact: true }).isDisabled(), true);
    assert.match(await page.getByTestId('installation-summary').innerText(), /未知/);
    // A failed new model never leaves the previous source's analysis on screen.
    await page.route('**/solar-analysis/model?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: '测试模型暂不可用' }) }));
    await page.getByLabel('发电数据源', { exact: true }).selectOption('pvwatts');
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('#solar-step-summary').count(), 0);
    await page.unroute('**/solar-analysis/model?**');
    await page.getByRole('button', { name: '重新加载模型', exact: true }).click();
    await page.locator('#solar-step-config').waitFor();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('#solar-step-installation').scrollIntoViewIfNeeded();
      // ECharts listens to the browser's asynchronous resize event.
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth, null, { timeout: 5000 }).catch(async error => {
        console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => ({ tag: e.tagName, cls: String(e.className), x: e.getBoundingClientRect().x, width: e.getBoundingClientRect().width, text: e.textContent.slice(0, 60) })).slice(0, 15)));
        await page.screenshot({ path: join(artifacts, 'overflow.png'), fullPage: true });
        console.log(artifacts);
        throw error;
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`);
      await page.locator('#solar-step-installation').screenshot({ path: join(artifacts, `${width}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, guardedData: true, installationConfirmation: true, tutorialSteps: 6, selectionUpdatesResults: true, horizontal: true, legacy: true, errorRecovery: true, artifacts }, null, 2));
    await context.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
