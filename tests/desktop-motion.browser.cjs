/* Read-only motion regression. No form submissions, emails or live record writes. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SITE_BASE || 'http://localhost:3216';
const out = process.env.MOTION_ARTIFACTS || '/tmp/solortide-desktop-motion';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  async function setup(width = 1440, reducedMotion = 'no-preference') {
    const context = await browser.newContext({ viewport: { width, height: width < 801 ? 844 : 900 }, reducedMotion });
    await context.route('https://trtc.io/knocket-sdk/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await context.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.fallback() : route.abort());
    await context.addInitScript(() => {
      sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1');
      window.__heroStarts = [];
      window.__handoff = [];
      window.addEventListener('solortide:navigation-reveal', () => {
        const time = performance.now();
        requestAnimationFrame(() => {
          const hero = document.querySelector('[data-hero-motion]');
          const loader = document.querySelector('[data-site-loader]');
          window.__handoff.push({ delay: performance.now() - time, phase: hero?.dataset.heroMotion, animating: hero?.getAnimations({subtree:true}).some(a=>a.animationName?.includes('arrive')), curtain: loader && getComputedStyle(loader).animationName, pointer: loader && getComputedStyle(loader).pointerEvents });
        });
      });
      document.addEventListener('animationstart', event => {
        if (event.target.closest?.('[data-hero-motion]')) window.__heroStarts.push({ name: event.animationName, part: event.target.dataset.heroReveal, time: performance.now() });
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    return { context, page, errors };
  }
  async function visit(page, path) {
    await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('[data-hero-motion]')?.dataset.heroMotion === 'done');
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html { scroll-behavior:auto!important } nextjs-portal { display:none }' });
  }
  for (let run = 1; run <= Number(process.env.RUNS || 1); run++) {
    const { context, page, errors } = await setup();
    await visit(page, '/');
    const entries = await page.evaluate(() => window.__heroStarts);
    assert(entries.some(e => e.part === '0') && entries.some(e => e.part === 'actions'), 'hero sequence ran');
    assert(entries.find(e => e.part === 'actions').time > entries.find(e => e.part === '0').time, 'actions follow title');
    const handoff = await page.evaluate(() => window.__handoff);
    assert(handoff.some(frame => frame.animating && frame.pointer === 'none' && frame.curtain.includes('curtain')), 'curtain and hero overlap; actions are not blocked');
    assert(entries.some(e => e.name.includes('backgroundSettle')), 'background settles independently');
    assert(entries.some(e => e.name.includes('energyLight')), 'gold emphasis lights last');
    assert.equal(await page.locator('[data-hero-motion] [data-position="bottom"]').count(), 1, 'hero has a tide edge');
    assert.equal(await page.locator('[class*="desktopHeroIslands"] a[href="/antigua"]').count(), 1);
    await page.screenshot({ path: `${out}/home-desktop.png` });
    await page.waitForFunction(() => document.querySelector('#journey [class*="storyImages"] img')?.complete, null, {timeout:20000});
    const heading = page.locator('#countries-title');
    await heading.evaluate(el => el.scrollIntoView({block:'center'}));
    await page.waitForFunction(() => document.querySelector('#countries-title').dataset.revealState === 'visible');
    assert.equal(await heading.evaluate(el => getComputedStyle(el, '::after').width), '48px', 'shared heading line');
    await page.locator('#countries').evaluate(el => el.scrollIntoView({block:'start'}));
    const map = page.locator('#countries svg[class*="map"]');
    await map.waitFor();
    await page.waitForFunction(() => document.querySelector('#countries [data-revealed]'));
    const activeIsland = map.locator('[data-island="AG"]');
    await activeIsland.focus();
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('#countries svg [class*="planned"]')).opacity) < .6);
    await page.mouse.move(0,0);
    await activeIsland.evaluate(el=>el.blur());
    const deck = page.locator('#packages [data-deck-phase]');
    await deck.evaluate(el => el.scrollIntoView({block:'center'}));
    await page.waitForFunction(() => document.querySelector('#packages [data-deck-phase]').dataset.deckPhase === 'open');
    const side = deck.locator('[data-slot="left"]');
    assert.equal(await side.locator('[class*="card-body"]').evaluate(el=>getComputedStyle(el).display), 'none', 'side-card details yield to title and price');
    assert.equal(await side.locator('h3').evaluate(el=>getComputedStyle(el).visibility), 'visible');
    const transform = await side.evaluate(el=>getComputedStyle(el).transform);
    await side.locator('button[class*="card-select"]').focus();
    await page.waitForFunction(before => getComputedStyle(document.querySelector('#packages [data-slot="left"]')).transform !== before, transform);
    await side.locator('button[class*="card-select"]').evaluate(el=>el.blur());
    const control = page.locator('[class*="hybridModes"] p').first();
    assert.equal(await control.evaluate(el=>getComputedStyle(el).fontSize), '16px');
    const sunset = await page.locator('#hybrid-system').evaluate(el=>({supported:CSS.supports('animation-timeline','view()'), timeline:getComputedStyle(el,'::before').animationTimeline}));
    assert(!sunset.supported || sunset.timeline.includes('view'), 'sunset follows scroll with static fallback');
    await page.locator('#questions').evaluate(el=>el.scrollIntoView());
    await heading.evaluate(el => el.scrollIntoView({block:'center'}));
    assert.equal(await heading.getAttribute('data-reveal-state'), 'visible', 'shared reveal does not replay');
    const footerSafe = await page.locator('footer [class*="bottom"]').evaluate(el => parseFloat(getComputedStyle(el).paddingRight));
    assert(footerSafe >= 72, 'footer reserves widget space');
    const story = page.locator('#journey [class*="storyImages"]');
    await story.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - innerHeight - 200));
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('#journey [class*="storyImages"] img');
      return images.length >= 2 && [...images].slice(0, 2).every(img => img.complete && img.naturalWidth);
    });
    assert(await story.evaluate(el => el.getBoundingClientRect().top > innerHeight), 'next story image loads before entry');
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/*installation.webp*', async route => { await gate; await route.continue(); });
    await page.locator('#step-3').evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - innerHeight * .2));
    await page.waitForFunction(() => document.querySelector('#step-3')?.dataset.active === 'true');
    assert((await story.locator('img[data-active="true"]').getAttribute('src')).includes('enquiry'), 'previous image stays while next is loading');
    release();
    await page.waitForFunction(() => document.querySelector('#journey [class*="storyImages"] img[data-active="true"]')?.getAttribute('src')?.includes('installation'));
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal((await page.evaluate(() => window.__heroStarts)).length, entries.length, 'hero does not replay on scroll');
    for (const path of ['/antigua', '/dominica']) {
      await visit(page, path);
      await page.screenshot({ path: `${out}/${path.slice(1)}-desktop.png` });
      const art = await page.locator('[data-hero-background]').evaluate(el => ({src:decodeURIComponent(el.currentSrc), font:getComputedStyle(document.querySelector('[class*="islandPromise"]')).fontFamily}));
      assert(art.src.includes('hero-clean-v2') && art.font.includes('Space Grotesk'), 'desktop regional artwork and typography');
      assert((await page.evaluate(()=>window.__heroStarts)).some(e=>e.name.includes('islandDraw')), 'regional outline draws');
      assert.equal(await page.locator('[data-island-outline] path').first().evaluate(el=>getComputedStyle(el).strokeDasharray), 'none', 'outline finishes as a continuous contour');
      await page.locator('#benefits').evaluate(el => el.scrollIntoView());
      await page.evaluate(() => {
        window.__statFrames = [];
        window.__statObserver = new MutationObserver(() => window.__statFrames.push([...document.querySelectorAll('[data-stat="payback"] [data-animated-value], [data-stat="response"] [data-animated-value]')].map(el => el.textContent)));
        window.__statObserver.observe(document.querySelector('#benefits'), { subtree:true, characterData:true, childList:true });
      });
      await page.waitForTimeout(750);
      const statFrames = await page.evaluate(() => { window.__statObserver.disconnect(); return window.__statFrames; });
      assert(statFrames.every(([payback, response]) => payback === '5' && response === '24h'), 'bounded stats never count through false values');
      assert.equal(await page.locator('[data-stat="payback"] [data-animated-value]').textContent(), '5');
      assert.equal(await page.locator('[data-stat="response"] [data-animated-value]').textContent(), '24h');
      await page.getByTestId('calculator-module').evaluate(el => el.scrollIntoView());
      const slider = page.getByRole('slider', { name: 'Adjust monthly bill' });
      const bounds = await slider.evaluate(el => ({min:+el.min,max:+el.max}));
      for (const amount of [bounds.min, bounds.max, bounds.min + 50]) {
        await slider.fill(String(amount));
        await page.waitForTimeout(35);
      }
      await page.waitForTimeout(240);
      const visual = await page.locator('[data-estimate-value]').evaluateAll(els => els.map(el => ({value:+el.dataset.estimateValue, text:el.textContent})));
      assert.equal(visual.length, 4);
      assert(visual.every(v => Number.isFinite(v.value) && v.text.length), 'all four estimate values settle');
      await page.getByLabel('Calculator currency', {exact:true}).selectOption('XCD');
      await page.waitForTimeout(240);
      assert((await page.getByTestId('price').textContent()).includes('EC$'));
      const currentPrice = await page.getByTestId('price').locator('[data-estimate-value]').evaluate(el => ({value:+el.dataset.estimateValue,text:el.textContent}));
      assert.equal(Number(currentPrice.text.replaceAll(',', '')), currentPrice.value, 'currency reset does not tween between currencies');
      await page.getByTestId('bill-input').fill('');
      assert.equal(await page.getByTestId('price').textContent(), '—');
      assert.equal(await page.locator('[data-estimate-value]').count(), 0);
      console.log(`run ${run}: ${path} passed`);
    }
    assert.deepEqual(errors, []);
    results.push({ run, desktop: 'passed' });
    await context.close();
  }
  for (const [width, motion] of [[390, 'no-preference'], [1440, 'reduce'], [1280, 'no-preference']]) {
    const { context, page, errors } = await setup(width, motion);
    for (const path of ['/', '/antigua', '/dominica']) {
      await visit(page, path);
      if (width === 390 && path !== '/') assert((await page.locator('[data-hero-background]').evaluate(el=>decodeURIComponent(el.currentSrc))).includes('map-hero-no-labels'), 'mobile retains its original art');
      if (width === 390 || motion === 'reduce') assert.equal((await page.evaluate(() => window.__heroStarts)).length, 0, 'mobile and reduced motion have no hero animation');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      await page.screenshot({ path: `${out}/${path === '/' ? 'home' : path.slice(1)}-${width}-${motion}.png` });
    }
    assert.deepEqual(errors, []);
    results.push({ width, motion, checked:'home + both regions' });
    await context.close();
  }
  // Delayed route feedback: progress first, branded overlay only for a slow route.
  {
    const {context,page,errors}=await setup();
    await visit(page,'/');
    await page.evaluate(()=>window.dispatchEvent(new Event('solortide:navigation-start')));
    await page.waitForFunction(()=>document.documentElement.dataset.siteLoading === 'pending');
    assert.equal(await page.locator('[data-site-loader]').evaluate(el=>getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.waitForFunction(()=>document.documentElement.dataset.siteLoadingSlow === 'true');
    await page.evaluate(()=>window.dispatchEvent(new Event('solortide:navigation-cancel')));
    await page.waitForFunction(()=>!document.documentElement.dataset.siteLoading);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.siteLoadingSlow),undefined);
    await page.getByRole('button',{name:'Cookie preferences',exact:true}).click();
    const banner=page.locator('[data-cookie-notice]');
    await banner.waitFor();
    assert((await banner.boundingBox()).height < 120, 'desktop cookie banner is compact');
    await page.screenshot({path:`${out}/cookie-desktop.png`});
    await banner.getByRole('button',{name:'Manage preferences'}).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await banner.getByRole('button',{name:'Close cookie notice'}).click();
    await page.locator('[class*="desktopHeroIslands"] a[href="/antigua"]').click();
    await page.waitForURL('**/antigua');
    await page.waitForFunction(()=>!document.documentElement.dataset.siteLoading && document.querySelector('[data-hero-motion]')?.dataset.heroMotion==='done');
    assert.equal(await page.locator('[data-hero-motion]').getAttribute('data-country'),'AG');
    assert.deepEqual(errors,[]);
    await context.close();
    results.push({navigation:'progress, slow overlay and cancel passed'});
  }
  await browser.close();
  fs.writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
})().catch(error => { console.error(error); process.exit(1); });
