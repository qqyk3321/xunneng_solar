// Regional benefits: responsive content, native disclosure, keyboard and scroll behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/petuniq-playwright/node_modules/playwright');
const origin = process.env.BENEFITS_TEST_ORIGIN || 'http://127.0.0.1:3195';
const output = process.env.BENEFITS_TEST_OUTPUT;
const stage = process.env.BENEFITS_TEST_STAGE || 'local';
const bypass = process.env.BENEFITS_TEST_PROTECTED === '1'
  ? Object.keys(JSON.parse(fs.readFileSync('/tmp/calculator-compact-project.json')).protectionBypass || {})[0]
  : undefined;
const clean = text => text.replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await chromium.launch();
  const results = [];
  if (output) fs.mkdirSync(output, { recursive: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', hasTouch: true });
    await context.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
    await context.route('**/*', route => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.abort();
      return route.continue(bypass && new URL(route.request().url()).origin === origin
        ? { headers: { ...route.request().headers(), 'x-vercel-protection-bypass': bypass } } : {});
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const positionSection = async () => {
      await page.locator('#benefits').evaluate(el => {
        const header = document.querySelector('header').getBoundingClientRect();
        window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - header.height, behavior: 'instant' });
      });
      await settle();
    };
    for (const region of ['antigua', 'dominica']) {
      for (const [width, height] of [[320,568],[390,568],[390,844],[430,932],[768,1024],[800,900],[801,900],[1050,900],[1440,1000]]) {
        await page.setViewportSize({ width, height });
        let response;
        for (let retry = 0; ; retry++) {
          try { response = await page.goto(`${origin}/${region}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; }
          catch (error) { if (retry >= 2 || !/net::ERR_/.test(error.message)) throw error; }
        }
        assert.equal(response.status(), 200);
        await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
        await page.evaluate(() => document.fonts.ready);
        await page.locator('header img').evaluateAll(imgs => Promise.all(imgs.filter(i => i.getBoundingClientRect().width).map(i => i.decode())));
        await positionSection();
        const section = page.locator('#benefits');
        assert.equal(await section.locator('[data-stat]').count(), 4);
        assert.deepEqual(await section.locator('dt').allTextContents(), ['Systems installed', 'Bill savings potential', 'Payback period', 'Response time']);
        assert.deepEqual(await section.locator('[data-animated-value]').allTextContents(), ['100+', '95%', '5', '24h']);
        assert.equal(await section.getByText('years', { exact: true }).count(), 1);
        assert.doesNotMatch(await section.innerText(), /Illustrative|For suitable|Planning targets|24\/7 RESILIENT|Up to|Target: within/);
        const mobile = width <= 800;
        assert.equal(await section.locator('ul').isVisible(), !mobile);
        assert.equal(await section.locator('details').first().isVisible(), mobile);
        assert.equal(clean(await section.locator('h2').innerText()), mobile ? 'Solar you can count on' : `Your ${region === 'antigua' ? 'Antigua' : 'Dominica'} home. Solar you can count on`);
        const m = await section.evaluate(el => {
          const rect = node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom, right:r.right }; };
          const cards = [...el.querySelectorAll('[data-stat]')].map(card => {
            const value = card.querySelector('dd'), label = card.querySelector('dt');
            const c = rect(card), v = rect(value), l = rect(label);
            return { ...c, centerDelta:(v.y+l.bottom)/2-(c.y+c.height/2), clipped:value.scrollWidth>card.clientWidth || label.scrollWidth>card.clientWidth };
          });
          return { section:rect(el), header:rect(document.querySelector('header')), cards,
            overflow:document.documentElement.scrollWidth>innerWidth,
            calculatorBackground:getComputedStyle(document.querySelector('#calculator')).backgroundColor,
            background:getComputedStyle(el).backgroundColor,
            next:rect(document.querySelector('#solar-installation')) };
        });
        assert.equal(m.overflow, false);
        assert.ok(m.cards.every(c => !c.clipped && Math.abs(c.centerDelta)<1), `stat alignment ${region} ${width}`);
        assert.ok(m.cards.every(c => Math.abs(c.height-m.cards[0].height)<1 && Math.abs(c.width-m.cards[0].width)<1));
        assert.equal(m.cards[0].y, m.cards[1].y); assert.equal(m.cards[2].y, m.cards[3].y);
        assert.ok(Math.abs(m.next.y-m.section.bottom)<1, 'No blank gap before installation');
        if (mobile) {
          assert.ok(m.section.y>=m.header.bottom-1);
          assert.equal(m.background, 'rgb(255, 255, 255)');
          assert.equal(m.calculatorBackground, 'rgb(229, 238, 233)');
          assert.equal(await section.locator('details[open]').count(), 1);
          assert.equal(await section.locator('details').first().getAttribute('open'), '');
          const first = section.locator('summary').nth(0);
          const y = await page.evaluate(() => scrollY);
          await first.tap(); await settle();
          assert.equal(await section.locator('details[open]').count(), 0);
          assert.ok(await section.evaluate(el => el.getBoundingClientRect().bottom)<=height+1, 'Collapsed module fits');
          await first.tap(); await settle();
          assert.equal(await section.locator('details[open]').count(), 1);
          assert.ok(Math.abs(await page.evaluate(() => scrollY)-y)<1, 'Opening does not scroll');
          if (output && width === 390 && height === 844) await page.screenshot({ path:`${output}/${stage}-${region}-mobile-expanded.png` });
          const second = section.locator('summary').nth(1);
          await second.evaluate(el => el.focus({ preventScroll:true }));
          await page.keyboard.press('Enter'); await settle();
          assert.equal(await section.locator('details[open]').count(), 1);
          assert.equal(await section.locator('details').nth(1).getAttribute('open'), '');
          assert.match(await section.locator('details[open] p').innerText(), new RegExp(`${region === 'antigua' ? 'UL' : 'CE'}-certified`));
          assert.equal(await second.evaluate(el => el === document.activeElement), true);
          await page.keyboard.press('Space'); await settle();
          assert.equal(await section.locator('details[open]').count(), 0);
          assert.ok(Math.abs(await page.evaluate(() => scrollY)-y)<1, 'Switch/collapse does not scroll');
          assert.ok(await second.evaluate(el => getComputedStyle(el).outlineStyle!=='none'), 'Keyboard focus is visible');
        }
        if (output && ((width === 390 && height === 844) || width === 320 || width === 1440)) {
          await positionSection();
          await page.screenshot({ path:`${output}/${stage}-${region}-${width}-closed.png` });
          if (width === 1440) await section.screenshot({ path:`${output}/${stage}-${region}-desktop-section.png` });
        }
        results.push({ region,width,height,...m });
      }
    }
    // Normal motion and breakpoint changes keep content and disclosure state usable.
    await page.emulateMedia({ reducedMotion:'no-preference' });
    await page.setViewportSize({ width:390, height:844 });
    await page.goto(`${origin}/antigua`); await positionSection();
    await page.waitForFunction(() => [...document.querySelectorAll('#benefits [data-animated-value]')].map(n=>n.textContent).join('|') === '100+|95%|5|24h');
    assert.equal(await page.locator('#benefits details').first().getAttribute('open'), '');
    await page.setViewportSize({ width:1440, height:1000 });
    assert.equal(await page.locator('#benefits ul').isVisible(), true);
    assert.equal(await page.locator('#benefits details').first().isVisible(), false);
    await page.setViewportSize({ width:390, height:844 });
    assert.equal(await page.locator('#benefits details[open]').count(), 1);
    await page.locator('#benefits summary').first().tap();
    assert.equal(await page.locator('#benefits details[open]').count(), 0);
    assert.deepEqual(errors, []);
    if (output) fs.writeFileSync(`${output}/${stage}-checks.json`, JSON.stringify(results, null, 2));
    console.log(`PASS ${stage}: ${results.length} regional/viewport cases; keyboard, tap, single disclosure, no scroll, responsive sizing, normal/reduced motion.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
