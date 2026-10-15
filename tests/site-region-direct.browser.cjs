// Focused region-picker regression. External forms and all writes are blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/petuniq-playwright/node_modules/playwright');
const origin = process.env.REGION_DIRECT_ORIGIN || 'http://127.0.0.1:3199';
const output = process.env.REGION_DIRECT_OUTPUT;
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => {
        if (window.top !== window) return;
        localStorage.setItem('sol-tide:installation-region:v1', 'DM');
        sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1');
      });
      await context.route('**/*', route => {
        if (new URL(route.request().url()).hostname.endsWith('tally.so'))
          return route.fulfill({ contentType: 'text/html', body: '<p>Mock assessment form</p>' });
        return ['GET','HEAD','OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort();
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.setDefaultTimeout(20000);
      page.setDefaultNavigationTimeout(60000);
      const idle = () => page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      const go = async path => { assert.equal((await page.goto(origin+path, {waitUntil:'domcontentloaded'})).status(), 200); await idle(); };
      const chooser = page.getByRole('dialog', {name:'Where would you like to install your system?'});
      const switcher = page.locator('footer').getByRole('button', {name:'Change installation location'});
      const checkNeutral = async () => {
        await chooser.waitFor();
        assert.equal(await chooser.locator('[aria-pressed]').count(), 0);
        assert.equal(await chooser.getByRole('button', {name:/^(Save location|Continue|Change location and restart)$/}).count(), 0);
        assert.equal(await chooser.getByRole('group', {name:'Installation location'}).getByRole('button').count(), 2);
        assert.doesNotMatch(await chooser.innerText(), /✓/);
        assert.equal(await chooser.locator('li').count(), 16);
        assert.equal(await chooser.evaluate(el=>el.scrollWidth>el.clientWidth), false);
      };
      await go('/antigua');
      assert.equal(await chooser.isVisible(), false);
      await switcher.click(); await checkNeutral();
      await page.evaluate(()=>document.fonts.ready);
      if (output) { fs.mkdirSync(output,{recursive:true}); await page.screenshot({path:`${output}/picker-${width}.png`}); }
      await page.keyboard.press('Escape');
      await chooser.waitFor({state:'hidden'});
      assert.equal(await switcher.evaluate(el=>el===document.activeElement),true);
      await switcher.click(); await checkNeutral();
      await chooser.getByRole('button',{name:/Antigua/}).click();
      await chooser.waitFor({state:'hidden'});
      assert.equal(page.url(),origin+'/antigua');
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.siteLoading),undefined);
      await switcher.click();
      await chooser.getByRole('button',{name:/Dominica/}).focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(origin+'/dominica'); await idle();
      await switcher.click(); await checkNeutral();
      await chooser.getByRole('button',{name:/Antigua/}).click();
      await page.waitForURL(origin+'/antigua'); await idle();
      await page.goBack(); await page.waitForURL(origin+'/dominica'); await idle();
      assert.equal(await chooser.isVisible(),false);
      // Root business intents keep their destination after the extra save step is removed.
      for (const [label,suffix] of [['Savings','#calculator'],['FAQ','/faq'],['How it works','/how-it-works'],['Get Your Free Assessment','/consultation']]) {
        await go('/');
        assert.equal(page.url(),origin+'/');
        assert.equal(await chooser.isVisible(),false);
        if(width<1000) await page.getByRole('button',{name:'Open menu',exact:true}).click();
        await page.locator('header').getByRole('button',{name:label,exact:true}).click();
        await checkNeutral();
        await chooser.getByRole('button',{name:/Dominica/}).click();
        await page.waitForURL(origin+'/dominica'+suffix); await idle();
      }
      assert.equal(await page.getByRole('checkbox').isChecked(),false);
      assert.equal(await chooser.isVisible(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`PASS ${width}px: no preselection/save, immediate region/intent navigation, same country, keyboard/Escape, Back and correct consultation entry.`);
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
