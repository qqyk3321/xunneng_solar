const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { accessCookieValue, SOLAR_ACCESS_COOKIE } = require('../app/solar-analysis/access.ts');
const assert = require('node:assert/strict');
const { mkdtemp } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const origin = process.env.SOLAR_LOG_TEST_ORIGIN || 'http://127.0.0.1:3003';

(async () => {
  const browser = await chromium.launch();
  const artifacts = await mkdtemp(join(tmpdir(), 'solar-tour-'));
  try {
    for (const [width, height] of [[1280, 720], [390, 844], [320, 640]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.route('https://**/*', route => route.abort());
      await context.route('**/solar-analysis/visit', route => route.fulfill({ status: 204 }));
      await context.route('**/_vercel/**', route => route.fulfill({ status: 204 }));
      await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict' }]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/solar-analysis');
      await page.locator('#solar-step-hourly').waitFor();
      assert.equal(await page.getByText('面板正面', { exact: true }).count(), 0);
      await page.getByRole('button', { name: '使用教程', exact: true }).click();
      const targets = ['solar-input-fields', 'solar-step-profile', 'solar-step-installation', 'solar-live-summary', 'solar-month-tabs', 'solar-monthly-heading', 'solar-self-use-metric', 'solar-saving-metric', 'solar-report-button'];
      for (const [index, target] of targets.entries()) {
        const panel = page.locator(`.analysis-tour[data-target="${target}"]`);
        await panel.waitFor();
        await page.waitForFunction(id => {
          const p = document.querySelector('.analysis-tour');
          const t = document.getElementById(id);
          if (!p || !t || !t.classList.contains('tour-target')) return false;
          const a = p.getBoundingClientRect(), b = t.getBoundingClientRect();
          return a.x >= 0 && a.y >= 0 && a.right <= innerWidth && a.bottom <= innerHeight &&
            (a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        }, target, { timeout: 5000 }).catch(async error => {
          await page.screenshot({ path: join(artifacts, `failure-${width}-${index}.png`) });
          console.error(artifacts);
          throw error;
        });
        assert.equal(await page.locator('.tour-backdrop').isVisible(), true);
        assert.equal(await page.evaluate(() => !!document.elementFromPoint(1, 1)?.closest('.tour-backdrop')), true, 'surroundings are covered by the mask');
        assert.equal(await page.locator('.tour-pointer').isVisible(), true);
        assert.equal(await page.locator('.tour-focus-frame').isVisible(), true);
        assert.equal(await page.evaluate(() => Number(getComputedStyle(document.querySelector('.tour-emphasis')).zIndex) > Number(getComputedStyle(document.querySelector('.tour-backdrop')).zIndex)), true, 'frame and arrow have an independent layer above the mask');
        assert.ok(await page.locator('.tour-pointer .tour-connector-line').last().getAttribute('d'), 'arrow connects the card to its target frame');
        if (index === 1) await page.getByLabel('选择每日用电模型', { exact: true }).selectOption('daytime');
        if (index === 3) {
          await page.getByLabel('悬浮汇总国家', { exact: true }).selectOption('dominica');
          await page.screenshot({ path: join(artifacts, `summary-${width}.png`) });
        }
        if (index === 4) await page.getByRole('button', { name: '6月', exact: true }).click();
        if(index === 8) {
          await page.screenshot({path:join(artifacts,`report-step-${width}.png`)});
          await page.getByRole('button',{name:'生成客户报告 PDF',exact:true}).click();
          await page.getByRole('dialog',{name:'生成客户方案报告',exact:true}).waitFor();
          assert.equal(await page.locator('.tour-backdrop, .tour-emphasis').count(),0);
          await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
        } else await panel.getByRole('button', { name: '下一步', exact: true }).click();
      }
      assert.equal(await page.locator('.analysis-tour, .tour-target, .tour-backdrop, .tour-emphasis').count(), 0);
      await page.getByRole('button', { name: '使用教程', exact: true }).click();
      await page.locator('.analysis-tour').waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.analysis-tour, .tour-target, .tour-backdrop, .tour-emphasis').count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}: 9 spotlight steps, mask outside target, arrows, live controls, report entry opens, Escape cleanup`);
    }
    console.log(artifacts);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
