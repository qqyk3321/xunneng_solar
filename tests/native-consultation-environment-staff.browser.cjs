const { chromium } = require('/tmp/pet-reference-browser/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const f = JSON.parse(fs.readFileSync('/tmp/native-environment-fixture.json'));
const origin = 'http://127.0.0.1:3137';
const sql = q => execFileSync('docker', ['exec','xunneng-native-test-20261029','psql','-U','postgres','-d','consultations','-At','-v','ON_ERROR_STOP=1','-c',q], { encoding: 'utf8' }).trim();
(async () => {
  sql(`update consultation_submission_context set environment=environment || '{"ip":"203.0.113.25","ipSource":"vercel","ipGeo":{"source":"vercel","countryCode":"AG","regionCode":"04","city":"Saint John’s","timezone":"America/Antigua"}}'::jsonb where consultation_id='${f.id}'`);
  // Additional changes are confined to this test's synthetic record.
  for (let i = 0; i < 5 && Number(sql(`select count(*) from consultation_changes where consultation_id='${f.id}'`)) < 6; i++) sql(`select update_native_consultation('${f.id}',(select token_hash from consultation_management_grants where consultation_id='${f.id}' limit 1),gen_random_uuid(),repeat('c',64),(select revision from consultations where id='${f.id}'),'electricity','{"monthlyKwh":${900+i},"profile":"night"}','{"ip":"203.0.113.25","browser":"Firefox","os":"Linux","device":"desktop","ipGeo":{"countryCode":"DM","city":"Roseau","timezone":"America/Dominica"}}')`);
  const browser = await chromium.launch();
  try {
    for (const locale of ['zh', 'en']) {
      const context = await browser.newContext({ viewport: { width: locale === 'zh' ? 1440 : 390, height: 900 } });
      await context.addCookies([{ name: 'staff-locale', value: locale, url: origin }]);
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/submissions/' + f.id, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const env = page.locator('[data-testid="submission-environment"]');
      await env.locator('summary').click();
      const text = await env.innerText();
      assert.ok(text.includes('Saint John’s'));assert.ok(text.includes('America/Antigua'));assert.ok(text.includes('iOS'));assert.ok(text.includes('Safari'));
      assert.ok(text.includes(locale==='en' ? 'IP area (estimated)' : 'IP 所在地（估算）'));
      assert.equal(await env.getByRole('link').count(),0);assert.ok(!text.includes('17.1274'));
      const cards=page.locator('[data-testid="submission-detail-card"], [data-testid="submission-environment"], [data-testid="submission-changes"], [data-testid="submission-email-history"]');
      const boxes=await cards.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));
      for(let i=1;i<boxes.length;i++) assert.ok(Math.abs(boxes[i].top-boxes[i-1].bottom - (locale==='en'?20:28)) < 2);
      await page.screenshot({path:`design/native-consultation-20261030/request-context/ip-staff-full-${locale}.png`,fullPage:true});await env.scrollIntoViewIfNeeded(); await page.screenshot({ path: `design/native-consultation-20261030/request-context/staff-${locale}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const changes = page.locator('[data-testid="submission-changes"]');
      await changes.locator('article').first().locator('summary').click();
      assert.ok((await changes.locator('article').first().innerText()).includes('203.0.113.25'));
      assert.ok((await changes.locator('article').first().innerText()).includes('Firefox'));assert.ok((await changes.locator('article').first().innerText()).includes('Roseau'));
      await changes.getByRole('link', { name: locale === 'en' ? 'Next' : '下一页', exact: true }).click();
      await page.waitForURL(/changesPage=2/); await page.reload();
      await changes.locator('article').first().locator('summary').click();
      assert.ok((await changes.innerText()).includes('Chrome'));
      await context.addCookies([{ name: 'fixture-denied', value: 'true', url: origin }]);
      await page.reload(); await page.waitForURL(/login/);
      assert.equal(await page.locator('[data-testid="submission-environment"]').count(), 0);
      assert.deepEqual(errors, []);
      console.log('PASS staff', locale, 'IP regions, no GPS, card spacing, changes pagination/F5, mobile bounds and denied access');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
