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
    await context.route('https://**/*', route => new URL(route.request().url()).origin === new URL(origin).origin ? route.fallback() : route.abort());
    await context.route('**/_vercel/**', route => route.fulfill({ status: 204 }));
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', r => requests.push(r.url()));
    await page.goto(origin + '/solar-analysis');
    await page.locator('#solar-password').waitFor();
    assert.equal(await page.locator('#solar-step-installation').count(), 0);
    assert.equal(await page.getByTestId('live-annual-summary').count(), 0);
    assert.equal((await context.request.get(origin + '/solar-analysis/model?id=hoymiles')).status(), 401);
    await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict' }]);
    await page.goto('about:blank');
    await page.goto(origin + "/solar-analysis#solar-step-installation");
    await page.locator('#solar-step-installation').waitFor();
    assert.equal(await page.locator('#solar-step-config').count(), 1);
    assert.equal(await page.locator('#solar-step-config #solar-step-profile').count(), 1);
    assert.equal(await page.locator('#solar-step-config #solar-step-installation').count(), 1);
    assert.equal(await page.locator('.config-preview, .v2-profile-grid').count(), 0);
    await page.waitForFunction(() => document.activeElement?.id === 'solar-step-config' && window.scrollY === 0);
    assert.equal(new URL(page.url()).hash, '');
    await page.locator('.compact-profile-chart canvas').waitFor();
    for (const [width, height] of [[1366, 768], [1280, 720]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await page.locator('#solar-step-config').boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= height, 'all parameters fit in ' + width + 'x' + height + ': ' + JSON.stringify(box));
      await page.screenshot({ path: join(artifacts, 'first-screen-' + width + '.png') });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const settings = async action => {
      await page.getByRole('button', { name: '修改数据与安装设置', exact: true }).click();
      await page.getByRole('dialog', { name: '数据与安装设置', exact: true }).waitFor();
      await action();
      await page.getByRole('button', { name: '完成设置', exact: true }).click();
    };
    const selectSetting = (name, value) => settings(() => page.getByLabel(name, { exact: true }).selectOption(value));
    assert.equal(await page.getByTestId('live-baseline-kwh').innerText(), '3,650.00');
    assert.equal(await page.locator('#solar-step-config input[type="number"]').first().inputValue(), '300');
    const inputField = label => page.locator('#solar-input-fields .v2-field').filter({ has: page.getByText(label, { exact: true }) }).locator('input, select');
    assert.equal(await inputField('逆变器').inputValue(), '3.8');
    assert.equal(await inputField('电池').inputValue(), '5');
    assert.equal(await inputField('组件功率（W）').inputValue(), '350');
    assert.equal(await inputField('超配比（DC/AC）').inputValue(), '1.2');
    assert.equal(await page.getByLabel('选择每日用电模型', { exact: true }).inputValue(), 'night');
    assert.equal(await page.getByLabel('选择每日用电模型', { exact: true }).locator('option:checked').innerText(), '夜间高峰');
    assert.equal(await page.getByRole('button', { name: '倾角 30°', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: '朝向 南', exact: true }).getAttribute('aria-pressed'), 'true');
    for (const [name, letter] of [['北', 'N'], ['东', 'E'], ['南', 'S'], ['西', 'W']]) {
      assert.equal(await page.getByRole('button', { name: `朝向 ${name}`, exact: true }).innerText(), letter);
    }
    assert.equal(await page.getByTestId('live-capacity').innerText(), '4.90 kWp');
    await page.locator('#solar-step-hourly').waitFor();
    assert.notEqual(await page.getByTestId('live-generation').innerText(), '—');
    assert.ok(requests.some(u => u.includes('/solar-analysis/model?')));
    assert.equal(await page.getByRole('button', { name: '确认安装条件，开始分析' }).count(), 0);
    await page.getByRole('button', { name: '查看用电模型详情', exact: true }).click();
    await page.getByLabel('详情用电模型', { exact: true }).selectOption('daytime');
    await page.getByRole('button', { name: '切换为该模式', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '该模式已选中', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: '关闭弹窗', exact: true }).click();
    await page.getByRole('button', { name: '使用教程', exact: true }).click();
    await page.getByRole('heading', { name: '输入用电与系统参数', exact: true }).waitFor();
    assert.match(await page.locator('.tour-progress').innerText(), /1 \/ 9/);
    assert.equal(await page.locator('#solar-input-fields.tour-target').count(), 1);
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    await page.locator('#solar-step-profile.tour-target').waitFor();
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    await page.getByRole('heading', { name: '选择数据源与安装条件', exact: true }).waitFor();
    assert.match(await page.locator('.tour-progress').innerText(), /3 \/ 9/);
    assert.equal(await page.locator('#solar-step-installation.tour-target').count(), 1);
    await page.getByRole('button', { name: '倾角 20°', exact: true }).click();
    await page.getByRole('button', { name: '朝向 东', exact: true }).click();
    assert.match(await page.getByTestId('installation-summary').innerText(), /朝东 · 20°/);
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    await page.locator('#solar-live-summary.tour-target').waitFor();
    assert.equal(await page.locator('.tour-backdrop').isVisible(), true);
    await page.screenshot({ path: join(artifacts, 'tour-summary.png') });
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    await page.locator('#solar-month-tabs.tour-target').waitFor();
    assert.match(await page.locator('.tour-progress').innerText(), /5 \/ 9/);
    for (const target of ['solar-monthly-heading', 'solar-self-use-metric', 'solar-saving-metric', 'solar-report-button']) {
      await page.getByRole('button', { name: '下一步', exact: true }).click();
      await page.locator(`#${target}.tour-target`).waitFor();
    }
    await page.getByRole('button', { name: '完成', exact: true }).click();
    const total = () => page.locator('.v2-summary article').first().locator('strong').innerText();
    const live = page.getByTestId('live-annual-summary');
    assert.equal(`${await page.getByTestId('live-generation').innerText()} kWh`, await total());
    const sameEnergy = await page.getByTestId('live-generation').innerText();
    const originalCost = await page.getByTestId('live-baseline-cost').innerText();
    const modelRequests = requests.filter(u => u.includes('/solar-analysis/model?')).length;
    await page.getByLabel('悬浮汇总国家', { exact: true }).selectOption('dominica');
    assert.notEqual(await page.getByTestId('live-baseline-cost').innerText(), originalCost);
    assert.equal(await page.getByTestId('live-generation').innerText(), sameEnergy);
    await settings(async () => assert.equal(await page.getByLabel('参考地区', { exact: true }).inputValue(), 'antigua'));
    assert.equal(requests.filter(u => u.includes('/solar-analysis/model?')).length, modelRequests);
    await page.locator('#solar-step-hourly').scrollIntoViewIfNeeded();
    const sticky = await live.boundingBox();
    assert.ok(sticky.y >= 0 && sticky.y + sticky.height <= 1000 && sticky.x > 1000, 'annual overview stays visible at right while scrolling');
    const usage = page.locator('#solar-step-config input[type="number"]').first();
    await usage.fill('650');
    assert.equal(await page.getByTestId('live-baseline-kwh').innerText(), '7,908.33');
    await usage.fill('0');
    assert.equal(await page.getByTestId('live-saving-percent').innerText(), '0.00%');
    assert.equal(await page.getByTestId('live-export-percent').innerText(), '100.00%');
    await usage.fill('500');
    const before = await total();
    await page.getByRole('button', { name: '朝向 西', exact: true }).click();
    await page.waitForFunction(previous => document.querySelector('.v2-summary article strong')?.textContent && document.querySelector('.v2-summary article strong').textContent !== previous, before);
    const west = await total();
    await selectSetting('参考地区', 'dominica');
    await page.waitForFunction(previous => document.querySelector('.v2-summary article strong')?.textContent && document.querySelector('.v2-summary article strong').textContent !== previous, west);
    await page.getByRole('button', { name: '倾角 0° 水平放置', exact: true }).click();
    await page.locator('#solar-step-hourly').waitFor();
    for (const direction of ['东', '南', '西', '北']) assert.equal(await page.getByRole('button', { name: `朝向 ${direction}`, exact: true }).isDisabled(), true);
    await selectSetting('安装方式', 'open-rack');
    await page.locator('#solar-step-hourly').waitFor();
    assert.match(await page.getByTestId('installation-summary').innerText(), /水平 0°.*通风支架/);
    await page.getByRole('button', { name: '倾角 15°', exact: true }).click();
    await settings(async () => assert.equal(await page.getByLabel('安装方式', { exact: true }).inputValue(), 'roof'));
    await page.locator('#solar-step-hourly').waitFor();
    const annualBeforeMonth = await total();
    await page.getByRole('button', { name: '6月', exact: true }).click();
    assert.equal(await total(), annualBeforeMonth);
    assert.equal(`${await page.getByTestId('live-generation').innerText()} kWh`, annualBeforeMonth);
    await page.getByLabel('选择每日用电模型', { exact: true }).selectOption('night');
    assert.equal(await page.getByLabel('选择每日用电模型', { exact: true }).inputValue(), 'night');
    for (const source of ['pvgis-era5', 'pvgis-nsrdb', 'nasa-power']) {
      const loaded = page.waitForResponse(r => r.url().includes('/solar-analysis/model?') && r.url().includes(source) && r.status() === 200);
      await selectSetting('发电数据源', source);
      const payload = await (await loaded).json();
      assert.equal(payload.source, source);
      assert.equal((payload.dcPowerW || payload.acPowerW).length, 8760);
      await page.locator('#solar-step-hourly').waitFor();
      assert.match(await page.locator('.source-settings-button').innerText(), source === 'pvgis-nsrdb' ? /2014/ : /2022/);
      assert.match(await total(), /\d/);
    }
    await selectSetting('发电数据源', 'hoymiles');
    await page.locator('#solar-step-hourly').waitFor();
    assert.equal(await page.getByRole('button', { name: '倾角 15°', exact: true }).count(), 0);
    await settings(async () => assert.equal(await page.getByLabel('参考地区', { exact: true }).isDisabled(), true));
    assert.match(await page.getByTestId('installation-summary').innerText(), /未知/);
    // A failed new model never leaves the previous source's analysis on screen.
    await page.route('**/solar-analysis/model?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: '测试模型暂不可用' }) }));
    await selectSetting('发电数据源', 'pvwatts');
    await page.locator('.model-loading [role="alert"]').waitFor();
    assert.equal(await page.locator('#solar-step-summary').count(), 0);
    assert.equal(await page.getByTestId('live-generation').innerText(), '—');
    assert.equal(await page.getByTestId('live-cost').innerText(), '—');
    await page.unroute('**/solar-analysis/model?**');
    await page.getByRole('button', { name: '重新加载模型', exact: true }).click();
    await page.locator('#solar-step-hourly').waitFor();
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
      if (width < 1180) {
        const toggle = page.getByRole('button', { name: /年省.*展开/ });
        await toggle.click();
        await page.getByLabel('悬浮汇总国家', { exact: true }).selectOption('antigua');
        assert.equal(await page.getByTestId('live-generation').isVisible(), true);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await live.screenshot({ path: join(artifacts, `summary-${width}.png`) });
        await page.getByRole('button', { name: /年省.*收起/ }).click();
      }
      await page.locator('#solar-step-installation').screenshot({ path: join(artifacts, `${width}.png`) });
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator('#solar-step-summary').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => window.scrollY > 0));
    await page.reload();
    await page.waitForFunction(() => document.activeElement?.id === 'solar-step-config' && window.scrollY === 0);
    assert.equal(await page.getByRole('heading', { name: '参数选择', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: '查看用电模型详情', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.getByRole('button', { name: '查看用电模型详情', exact: true }).evaluate(el => el === document.activeElement), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, guardedData: true, sources: 5, automaticCalculation: true, tutorialSteps: 9, liveCountrySummary: true, workflowOrder: true, selectionUpdatesResults: true, horizontal: true, legacy: true, errorRecovery: true, artifacts }, null, 2));
    await context.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
