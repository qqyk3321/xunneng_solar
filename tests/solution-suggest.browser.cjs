const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { SOLAR_ACCESS_COOKIE, accessCookieValue } = require('../app/solution-suggest/access.ts');
const { FIXED_INSTALLATION, PROFILES, optimizeSystem } = require('../lib/solution-suggest/optimizer.ts');
const { calculateEquipmentCost, convertUsd } = require('../lib/solution-suggest/cost.ts');
const { modelId } = require('../lib/solution-suggest/models.ts');
const origin = process.env.SOLUTION_TEST_ORIGIN || 'http://127.0.0.1:3000';
const output = path.resolve('.next/solution-check');

(async () => {
  const manifest = require('../lib/solution-suggest/model-table-manifest.json');
  const model = JSON.parse(await fs.readFile('public' + manifest.url, 'utf8')).models.find(m => m.id === modelId(FIXED_INSTALLATION));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  await fs.mkdir(output, { recursive: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, acceptDownloads: true });
      await context.route('**/solution-suggest/visit', route => route.fulfill({ status: 204 }));
      await context.route('**/_vercel/**', route => route.fulfill({ status: 204 }));
      await context.route('https://**/*', route => new URL(route.request().url()).origin === origin ? route.fallback() : route.abort());
      await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue('private'), domain: new URL(origin).hostname, path: '/solution-suggest', httpOnly: true, sameSite: 'Strict' }]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/solution-suggest', { timeout: 60000 });
      await page.getByTestId('solution-recommendation').waitFor({ timeout: 60000 });
      for (const name of ['输入项目', '推荐逆变器', '电池容量', 'SOC 保留', '组件功率', '推荐超配比']) assert.equal(await page.getByLabel(name, { exact: true }).count(), 0, name);
      assert.equal(await page.locator('#solar-step-config .compact-help').count(), 0);
      assert.equal(await page.locator('#solar-live-summary').count(), 0);
      assert.equal(await page.getByRole('button', { name: '生成客户报告 PDF', exact: true }).count(), 0);
      for (const selector of ['#solar-step-installation', '.model-context', '#solar-step-hourly', '#solar-step-monthly', '#solar-step-summary']) assert.equal(await page.locator(selector).count(), 0, selector);
      assert.equal(await page.getByTestId('technical-statistics').isVisible(), true);
      assert.equal(await page.locator('#solar-step-config input, #solar-step-config select').count(), 2);
      assert.equal(await page.locator('.recommendation-head [role="status"]').count(), 0);
      assert.equal(await page.locator('main').getByText('基础目标：', { exact: false }).count(), 0);
      assert.equal(await page.getByText('只需修改月用电量与每日用电模型；设备配置和超配比自动推荐，其余条件固定。', { exact: true }).count(), 0);
      assert.equal(await page.locator('main').getByText('PVWatts', { exact: false }).count(), 0);
      for (const [name, value] of [['5 kW 逆变器成本',800], ['8 kW 逆变器成本',1100], ['10 kW 逆变器成本',1200], ['电池每5kWh成本',600], ['每块组件成本',100]]) assert.equal(Number(await page.getByLabel(name, { exact: true }).inputValue()), value);
      assert.equal(await page.getByLabel('价格倍数', { exact: true }).inputValue(), '1.0');
      const money = value => 'US$ ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const convertedMoney = async (testId, usd) => {
        const values = convertUsd(usd);
        const format = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        assert.equal(await page.getByTestId(testId + '-xcd').innerText(), 'EC$ ' + format(values.xcd));
        assert.equal(await page.getByTestId(testId + '-cny').innerText(), 'CN¥ ' + format(values.cny));
      };

      const check = async (demand, profile) => {
        const expected = optimizeSystem(model, demand, PROFILES[profile].values);
        await page.getByLabel('月用电量', { exact: true }).fill(String(demand));
        await page.getByLabel('选择每日用电模型', { exact: true }).selectOption(profile);
        await page.waitForFunction(expected => {
          const root = document.querySelector('[data-testid="solution-recommendation"]');
          return root?.getAttribute('aria-busy') === 'false' &&
            document.querySelector('[data-testid="recommended-inverter"]')?.textContent === expected.inverterKw + ' kW' &&
            document.querySelector('[data-testid="recommended-battery"]')?.textContent === expected.batteryKwh + ' kWh' &&
            document.querySelector('[data-testid="recommended-panels"]')?.textContent === expected.panelCount + ' 块 × 500 W' &&
            document.querySelector('[data-testid="recommended-coverage"]')?.textContent === (expected.coverage * 100).toFixed(2) + '%';
        }, expected);
        assert.equal(await page.getByTestId('recommended-coverage').innerText(), (expected.coverage * 100).toFixed(2) + '%');
        assert.equal(await page.getByTestId('recommended-night').innerText(), (expected.nightBatteryShare * 100).toFixed(2) + '%');
        assert.equal(await page.getByTestId('recommended-worst-night-battery').innerText(), (expected.worstNightBatteryShare * 100).toFixed(2) + '%');
        if (demand === 300) {
          assert.equal(expected.batteryKwh, 5);
          assert.equal(expected.inverterKw, 5);
        }
        const ratio = Number(await page.getByTestId('technical-ratio').innerText());
        assert.ok(ratio >= .6 && ratio <= 1.2);
        assert.ok(expected.panelCount <= 12 || expected.panelCount % 2 === 0);
        assert.equal(await page.locator('.recommendation-head [role="status"]').count(), 0);
        const prices = { inverters: { 5: Number(await page.getByLabel('5 kW 逆变器成本', { exact: true }).inputValue()), 8: Number(await page.getByLabel('8 kW 逆变器成本', { exact: true }).inputValue()), 10: Number(await page.getByLabel('10 kW 逆变器成本', { exact: true }).inputValue()) }, batteryPer5Kwh: Number(await page.getByLabel('电池每5kWh成本', { exact: true }).inputValue()), panelEach: Number(await page.getByLabel('每块组件成本', { exact: true }).inputValue()) };
        const costs = calculateEquipmentCost(expected, prices, Number(await page.getByLabel('价格倍数', { exact: true }).inputValue()));
        assert.equal(await page.getByTestId('cost-total').innerText(), money(costs.totalCost));
        assert.equal(await page.getByTestId('cost-sale-price').innerText(), money(costs.salePrice));
        for (const [id, value] of [['cost-inverter',costs.inverterCost], ['cost-battery',costs.batteryCost], ['cost-panels',costs.panelCost], ['cost-total',costs.totalCost], ['cost-sale-price',costs.salePrice]]) await convertedMoney(id, value);
      };
      await check(300, 'night');
      assert.equal(await page.getByTestId('recommended-panels').innerText(), '6 块 × 500 W');
      assert.equal(await page.getByTestId('live-export').count(), 0);
      assert.equal(await page.locator('.v2-summary').getByText('年度送给电网', { exact: true }).count(), 0);
      assert.equal(await page.getByTestId('energy-details').count(), 0);
      await check(300, 'daytime');
      await check(300, 'rush');
      await check(300, 'evening');
      await check(600, 'night');
      await check(700, 'night');
      await check(725, 'night');
      await check(750, 'night');
      assert.equal(await page.getByTestId('recommended-inverter').innerText(), '8 kW');
      assert.equal(await page.getByTestId('recommended-battery').innerText(), '20 kWh');
      assert.equal(await page.getByTestId('recommended-panels').innerText(), '14 块 × 500 W');
      await check(900, 'night');
      await check(1200, 'night');
      await check(3000, 'night');
      await check(0, 'night');
      await check(300, 'night');
      await page.getByRole('button', { name: '查看用电模型详情', exact: true }).click();
      await page.getByLabel('详情用电模型', { exact: true }).selectOption('daytime');
      await page.getByRole('button', { name: '切换为该模式', exact: true }).click();
      assert.equal(await page.getByLabel('选择每日用电模型', { exact: true }).inputValue(), 'daytime');
      await page.keyboard.press('Escape');
      await check(300, 'night');
      await page.getByRole('button', { name: '使用教程', exact: true }).click();
      const tourTargets = ['solar-input-fields', 'solar-step-profile', 'solar-step-recommendation', 'solar-step-technical'];
      for (let index = 0; index < tourTargets.length; index++) {
        await page.waitForFunction(target => document.querySelector('.analysis-tour')?.dataset.target === target, tourTargets[index]);
        assert.equal(await page.locator('#' + tourTargets[index]).isVisible(), true);
        assert.equal(await page.locator('.tour-progress b').innerText(), (index + 1) + ' / 4');
        await page.getByRole('button', { name: index === tourTargets.length - 1 ? '完成' : '下一步', exact: true }).click();
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      assert.equal(noOverflow, true, 'page must fit ' + viewport.width + 'px');
      await page.screenshot({ path: path.join(output, viewport.width === 1440 ? 'desktop.png' : 'mobile.png'), fullPage: false });
      await page.getByLabel('价格倍数', { exact: true }).fill('1.5');
      await page.getByLabel('价格倍数', { exact: true }).blur();
      assert.equal(await page.getByTestId('cost-sale-price').innerText(), 'US$ 3,000.00');
      await page.getByLabel('5 kW 逆变器成本', { exact: true }).fill('900');
      await page.getByLabel('电池每5kWh成本', { exact: true }).fill('700');
      await page.getByLabel('每块组件成本', { exact: true }).fill('125');
      assert.equal(await page.getByTestId('cost-total').innerText(), 'US$ 2,350.00');
      assert.equal(await page.getByTestId('recommended-panels').innerText(), '6 块 × 500 W', 'cost inputs must not resize the system');
      await page.getByLabel('价格倍数', { exact: true }).fill('1.26');
      await page.getByLabel('价格倍数', { exact: true }).blur();
      assert.equal(await page.getByLabel('价格倍数', { exact: true }).inputValue(), '1.3');
      assert.equal(await page.getByTestId('cost-sale-price').innerText(), 'US$ 3,055.00');
      await check(750, 'night');
      assert.equal(await page.getByTestId('cost-total').innerText(), 'US$ 5,650.00');
      assert.equal(await page.getByTestId('cost-sale-price').innerText(), 'US$ 7,345.00');
      await page.getByTestId('cost-calculator').screenshot({ path: path.join(output, viewport.width === 1440 ? 'cost-desktop.png' : 'cost-mobile.png') });
      await page.getByLabel('每块组件成本', { exact: true }).fill('');
      assert.equal(await page.getByTestId('cost-total').innerText(), '—');
      assert.equal(await page.getByTestId('cost-total-xcd').innerText(), '—');
      assert.equal(await page.getByTestId('cost-total-cny').innerText(), '—');
      assert.equal(await page.getByTestId('cost-calculator').getByRole('alert').count(), 1);
      await page.getByLabel('每块组件成本', { exact: true }).fill('125');
      assert.equal(await page.getByTestId('cost-total').innerText(), 'US$ 5,650.00');

      assert.deepEqual(errors, [], 'unexpected browser errors');
      console.log('PASS ' + viewport.width + 'px: live recommendations, four-step tutorial, USD costing and markup');
      await context.close();
    }
    console.log('Artifacts: ' + output);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
