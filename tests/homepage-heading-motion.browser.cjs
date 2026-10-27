const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3216';
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2', '1'));
    await page.route('https://trtc.io/knocket-sdk/**', route => route.fulfill({ body: '' }));
    const sampleAt = async (heading, top) => {
      await heading.evaluate((el, top) => window.scrollTo(0, scrollY + el.getBoundingClientRect().top - parseFloat(el.style.getPropertyValue('--heading-offset') || '0') - top), top);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return heading.evaluate(el => ({ opacity: +getComputedStyle(el).opacity, offset: parseFloat(el.style.getPropertyValue('--heading-offset') || '0') }));
    };
    for (const path of ['/', '/antigua', '/dominica']) {
      await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('main[data-heading-scroll]'));
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'html { scroll-behavior:auto!important }' });
      const targets = path === '/' ? ['#packages-heading', '#countries-title'] : ['#packages-heading', '#calculator-heading', '#benefits-heading', '#installation-heading', '#contact-heading'];
      for (const selector of targets) {
        const heading = page.locator(selector);
        await heading.waitFor({ state: 'attached' });
        const entering = await sampleAt(heading, 885);
        const reading = await sampleAt(heading, 450);
        const leaving = await sampleAt(heading, -20);
        const returning = await sampleAt(heading, 450);
        assert(entering.opacity < .25 && entering.offset > 8, `${path} ${selector}: soft entrance`);
        assert(reading.opacity > .99 && Math.abs(reading.offset) < .1, `${path} ${selector}: stable reading`);
        assert(leaving.opacity < .8, `${path} ${selector}: fade near top edge`);
        assert(returning.opacity > .99, `${path} ${selector}: scrolling back restores heading`);
      }
      console.log(`PASS ${path}: ${targets.length} section headings enter, hold, leave and return`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => !document.querySelector('main[data-heading-scroll]'));
    assert.equal(await page.locator('#packages-heading').evaluate(el => getComputedStyle(el).opacity), '1');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelector('main[data-heading-scroll]'));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('main[data-heading-scroll]'));
    assert.equal(await page.locator('#packages-heading').evaluate(el => getComputedStyle(el).opacity), '1');
    await page.goto(origin + '/antigua/faq', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('main[data-heading-scroll]').count(), 0);
    console.log('PASS mobile, reduced motion and FAQ unaffected');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
