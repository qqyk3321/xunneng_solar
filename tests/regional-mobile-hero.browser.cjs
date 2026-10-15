// Read-only release checks. Forms and other outgoing writes are blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HERO_TEST_ORIGIN || 'http://127.0.0.1:3193';
const output = process.env.HERO_TEST_OUTPUT;
const stage = process.env.HERO_TEST_STAGE || 'local';
(async () => {
  if (output) fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
    await context.route('**/*', route => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.abort();
      if (new URL(route.request().url()).hostname.endsWith('tally.so')) return route.fulfill({ contentType: 'text/html', body: '' });
      return route.continue(process.env.HERO_TEST_BYPASS && new URL(route.request().url()).origin === origin
        ? { headers: { ...route.request().headers(), 'x-vercel-protection-bypass': process.env.HERO_TEST_BYPASS } } : {});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const region of ['antigua', 'dominica']) {
      for (const [width, height, safe] of [[390,844,0],[320,568,0],[390,664,0],[430,932,0],[768,1024,0],[1440,1000,0],[390,664,34],[320,568,34]]) {
        await page.setViewportSize({ width, height });
        let response;
        for (let retry = 0; ; retry++) {
          try { response = await page.goto(`${origin}/${region}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; }
          catch (error) { if (retry >= 2 || !/net::ERR_/.test(error.message)) throw error; }
        }
        assert.equal(response.status(), 200);
        await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
        await page.evaluate(() => document.fonts.ready);
        const hero = page.getByTestId('home-hero');
        await hero.waitFor({ state: 'visible' });
        await hero.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
        await page.waitForFunction(() => document.querySelector('[data-testid="home-header"]').dataset.revealed === 'true');
        await page.locator('header img').evaluateAll(imgs => Promise.all(imgs.filter(img => img.getBoundingClientRect().width > 0).map(img => img.decode())));
        if (safe) await page.addStyleTag({ content: '.demo-home[data-regional-home]{--regional-safe-bottom:34px}' });
        assert.equal(await hero.locator('h1').innerText(), region === 'antigua' ? 'Solortide · Antigua & Barbuda' : 'Solortide · Dominica');
        assert.equal((await hero.locator('h2').innerText()).replace(/\s+/g, ' '), 'Clean energy. A brighter island home.');
        assert.equal(await hero.locator('[class*="heroNotes"] span').count(), 3);
        const assessment = hero.getByRole('link', { name: 'Get Your Free Assessment', exact: true });
        const estimate = hero.getByRole('link', { name: 'Get an Estimate', exact: true });
        assert.equal(await assessment.getAttribute('href'), `/${region}/consultation`);
        const m = await hero.evaluate((el, region) => {
          const box = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
          const q = s => el.querySelector(s);
          const media = box(q('[class*="heroMedia"]'));
          // Conservative original-art map bounds, before object-fit scaling/cropping.
          const bounds = region === 'antigua' ? [618,280,912,565] : [930,266,1085,552];
          const scale = Math.max(media.width / 1672, media.height / 941);
          const dx = (media.width - 1672 * scale) * (region === 'antigua' ? .53 : .61);
          const dy = (media.height - 941 * scale) * .5;
          return {
            hero:box(el), header:box(document.querySelector('header')), country:box(q('h1')), title:box(q('h2')),
            notes:box(q('[class*="heroNotes"]')), actions:box(q('[class*="heroActions"]')),
            buttons:[...q('[class*="heroActions"]').children].map(box), calculator:box(document.querySelector('#calculator')),
            map:{ x:media.x+dx+bounds[0]*scale, y:media.y+dy+bounds[1]*scale, right:media.x+dx+bounds[2]*scale, bottom:media.y+dy+bounds[3]*scale },
            overflow:document.documentElement.scrollWidth>innerWidth,
            textOverflow:[q('h1'),q('h2'),...q('[class*="heroNotes"]').children].some(e => e.scrollWidth>e.clientWidth+1),
            align:getComputedStyle(q('h1')).textAlign, titleSize:getComputedStyle(q('h2')).fontSize,
            copyDisplay:getComputedStyle(q('[class*="heroCopy"]')).display,
            dividers:[...q('[class*="heroNotes"]').children].slice(1).map(e=>getComputedStyle(e,'::before').backgroundColor),
          };
        }, region);
        assert.equal(m.overflow, false); assert.equal(m.textOverflow, false);
        assert.equal(m.align, region === 'dominica' ? 'right' : 'start');
        assert.deepEqual(m.dividers, ['rgb(245, 158, 11)', 'rgb(245, 158, 11)']);
        assert.ok(Math.abs(m.calculator.y-m.hero.bottom)<1, 'next section starts immediately after hero');
        if (width <= 700) {
          assert.equal(m.copyDisplay, 'none');
          assert.ok(m.hero.height <= height+1, 'mobile hero must fit one viewport');
          assert.ok(m.country.y >= m.header.bottom+2, 'country clears header');
          assert.ok(m.country.bottom+6 <= m.map.y, 'country does not cover map');
          assert.ok(m.map.bottom+8 <= m.title.y, `title clears map: ${JSON.stringify(m)}`);
          assert.ok(m.map.x >= 0 && m.map.right <= width, 'map is not cropped');
          assert.ok(m.notes.y >= m.title.bottom+27.5, 'title has breathing room');
          assert.ok(m.actions.y >= m.notes.bottom+19.5, 'facts clear buttons');
          assert.ok(m.buttons[1].y >= m.buttons[0].bottom+11.5, 'buttons stack');
          assert.ok(m.buttons.every(b => b.height>=52 && b.x>=19 && b.right<=width-19));
          assert.ok(m.actions.bottom <= m.hero.bottom-23-safe, 'bottom inset');
          assert.ok(m.hero.bottom-m.actions.bottom<=25+safe, 'no oversized blank tail');
        } else {
          assert.notEqual(m.copyDisplay, 'none');
          assert.equal(m.titleSize, width<=800 ? '47px' : '70px');
          assert.ok(m.notes.y > m.actions.bottom, 'retain desktop/tablet ordering');
        }
        if (output && !process.env.HERO_NO_SCREENSHOTS) await page.screenshot({ path:`${output}/${stage}-${region}-${width}x${height}${safe?'-safe34':''}.png` });
        results.push({ region,width,height,safe,...m });
        await estimate.click();
        await page.waitForFunction(() => document.activeElement?.id === 'calculator');
        const slider = page.locator('#calculator input[type="range"]').first();
        const before = Number(await slider.inputValue()); await slider.focus(); await slider.press('ArrowRight');
        assert.ok(Number(await slider.inputValue())>before);
        if (width === 320 && !safe) {
          const header = page.getByTestId('home-header');
          const toggle = header.locator('button[aria-controls="regional-main-nav"]');
          await toggle.click();
          assert.equal(await header.getByRole('navigation').isVisible(), true);
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
        }
        console.log(`PASS ${stage} ${region} ${width}x${height} safe${safe}: layout, map, next section and actions.`);
      }
    }
    assert.deepEqual(errors, []);
    if (output) fs.writeFileSync(`${output}/${stage}-checks.json`, JSON.stringify(results,null,2));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
