const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { accessCookieValue, SOLAR_ACCESS_COOKIE } = require('../app/solar-analysis/access.ts');
const { PDFDocument } = require('pdf-lib');
const { mkdtemp, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const origin = process.env.SOLAR_LOG_TEST_ORIGIN || 'http://localhost:3017';

(async () => {
  if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local production build only');
  const artifacts = await mkdtemp(join(tmpdir(), 'solar-offline-browser-'));
  const profile = join(artifacts, 'profile');
  const options = { viewport: { width: 1440, height: 1000 }, acceptDownloads: true };
  let context = await chromium.launchPersistentContext(profile, options);
  const setup = async () => {
    await context.route('**/solar-analysis/visit', r => r.fulfill({ status: 204 }));
    await context.route('**/_vercel/**', r => r.fulfill({ status: 204 }));
    await context.route('https://**/*', r => r.abort());
  };
  try {
    await setup(); let page = await context.newPage();
    await page.goto(origin + '/solar-analysis'); await page.locator('#solar-password').waitFor();
    assert.equal(await page.getByRole('button', { name: '启用离线使用', exact: true }).count(), 0);
    assert.equal((await context.request.get(origin + '/solar-analysis/offline-permission')).status(), 401);
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
    await context.addCookies([{ name: SOLAR_ACCESS_COOKIE, value: accessCookieValue(), domain: new URL(origin).hostname, path: '/solar-analysis', httpOnly: true, sameSite: 'Strict' }]);
    await page.reload(); await page.locator('#solar-step-hourly').waitFor();
    const manifest = await (await context.request.get(origin + '/solar-analysis/offline-assets.json')).json();
    assert.ok(manifest.assets.some(a => a.url.includes('pdf.worker')));
    assert.ok(!manifest.assets.some(a => a.url.includes('report-noto')));
    assert.ok(manifest.bytes < 5 * 1048576, 'English-only pack stays below 5 MiB');
    assert.equal((await context.request.get(origin + '/fonts/report-noto-sans-sc-v1.ttf')).status(), 404);
    assert.ok(!manifest.assets.some(a => /supabase|\/api\//.test(a.url)));
    await page.getByRole('button', { name: '离线使用', exact: true }).click();
    await page.getByRole('button', { name: '启用离线使用', exact: true }).click();
    await page.getByText('✓ 离线资源完整', { exact: true }).waitFor({ timeout: 120000 }).catch(async e => { console.error(await page.getByRole('dialog').innerText()); throw e; });
    console.log('Offline pack ready; checking restart and PDF');
    await page.screenshot({ path: join(artifacts, 'ready-desktop.png') });
    const cdp = await context.newCDPSession(page);
    const appManifest = await cdp.send('Page.getAppManifest');
    assert.deepEqual(appManifest.errors, []);
    assert.equal(JSON.parse(appManifest.data).scope, '/solar-analysis');
    console.log('Installability', JSON.stringify(await cdp.send('Page.getInstallabilityErrors')));
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await page.getByRole('button', { name: '安装到桌面', exact: true }).isVisible(), true);
      assert.equal(await page.getByText('下载本页面、模型、图表和报告资源后，断网也能重新打开、调整方案并生成 PDF。无需运行本地服务器。', { exact: true }).isVisible(), true);
      await page.screenshot({ path: join(artifacts, `ready-mobile-${width}.png`) });
    }
    await page.getByRole('button', { name: '关闭弹窗', exact: true }).click();
    // Clear both HTTP and model localStorage caches: only the offline pack remains.
    await page.evaluate(() => localStorage.clear());
    await cdp.send('Network.clearBrowserCache');
    await context.close();
    context = await chromium.launchPersistentContext(profile, { ...options, offline: true });
    await setup(); page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(origin + '/solar-analysis', { waitUntil: 'domcontentloaded' });
    assert.equal(response.headers()['x-solar-offline'], '1');
    await page.locator('#solar-step-hourly').waitFor({ timeout: 60000 });
    await page.locator('.v2-hourly-chart canvas').first().waitFor();
    const initial = await page.getByTestId('live-generation').innerText();
    await page.getByRole('button', { name: '朝向 东', exact: true }).click();
    assert.notEqual(await page.getByTestId('live-generation').innerText(), initial);
    await page.getByLabel('选择每日用电模型', { exact: true }).selectOption('daytime');
    await page.getByLabel('SOC 保留', { exact: true }).selectOption('20');
    await page.getByRole('button', { name: '使用教程', exact: true }).click();
    await page.getByText('输入用电与系统参数', { exact: true }).waitFor(); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '生成客户报告 PDF', exact: true }).click();
    await page.getByLabel('客户名称（选填）', { exact: true }).fill('离线客户');
    assert.equal(await page.getByRole('button', { name: '生成并预览 PDF', exact: true }).isDisabled(), true);
    await page.getByLabel('客户名称（选填）', { exact: true }).fill('Offline Customer / José');
    await page.getByRole('button', { name: '生成并预览 PDF', exact: true }).click();
    await page.getByTestId('report-preview').waitFor({ timeout: 120000 });
    const download = page.waitForEvent('download'); await page.getByRole('link', { name: '下载 PDF', exact: true }).click();
    const file = join(artifacts, 'offline-customer.pdf'); await (await download).saveAs(file);
    const pdf = await PDFDocument.load(await readFile(file)); assert.equal(pdf.getPageCount(), 7);
    for (const p of pdf.getPages()) { assert.ok(Math.abs(p.getWidth() - 595.28) < .1); assert.ok(Math.abs(p.getHeight() - 841.89) < .1); }
    await page.screenshot({ path: join(artifacts, 'offline-pdf-preview.png') });
    await page.getByRole('button', { name: '关闭弹窗', exact: true }).click();
    assert.deepEqual(errors, []);
    // No control of the homepage. The online lock screen invalidates the pack.
    await context.setOffline(false); await page.goto(origin + '/');
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller), null);
    await context.clearCookies(); await page.goto(origin + '/solar-analysis'); await page.locator('#solar-password').waitFor();
    assert.equal(await page.evaluate(async () => (await caches.keys()).some(k => k.startsWith('solortide-solar-offline-v1-data-'))), false);
    await context.setOffline(true); const missing = await page.reload(); assert.equal(missing.status(), 503);
    await page.getByText('暂时无法离线打开', { exact: true }).waitFor();
    console.log(JSON.stringify({ ok: true, artifacts, resources: manifest.assets.length, megabytes: (manifest.bytes / 1048576).toFixed(2), coldOfflineRestart: true, noHttpOrModelCache: true, offlineChartsAndTour: true, offlineEnglishPdf: true, unsupportedTextBlocked: true, pages: 7, passwordRevocation: true, homepageUnchanged: true }));
  } finally { await context.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
