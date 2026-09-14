const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch();
 try {
  for (const width of [375, 1440]) {
   const page = await browser.newPage({ viewport: { width, height: 1000 } });
   await page.route('https://**/*', r => r.abort());
   await page.goto('http://127.0.0.1:3003', { waitUntil: 'networkidle' });
   const dialog = page.getByRole('dialog', { name: 'Where would you like to install your system?' });
   await dialog.waitFor();
   assert.equal(await dialog.locator('img[src^="/flags/"]').count(), 2);
   await page.waitForFunction(() => [...document.querySelectorAll('dialog img')].every(img => img.complete && img.naturalWidth > 0));
   assert.equal(await dialog.getByRole('button', { name: 'Continue', exact: true }).isDisabled(), true);
   await page.keyboard.press('Escape');
   assert.equal(await dialog.isVisible(), true);
   await dialog.getByRole('button', { name: 'Dominica Commonwealth of Dominica' }).click();
   await page.screenshot({ path: `/tmp/site-region-${width}.png` });
   await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
   await dialog.waitFor({ state: 'hidden' });
   assert.equal(await page.evaluate(() => localStorage.getItem('sol-tide:installation-region:v1')), 'DM');
   assert.match(await page.getByTestId('home-hero').innerText(), /CE Certified Equipment/);
   assert.match(await page.locator('#hero-title').innerText(), /Solution for Dominica/);
   assert.doesNotMatch(await page.getByTestId('home-hero').innerText(), /Local Parts Stock/);
   assert.match(await page.locator('#benefits').innerText(), /Your Dominica home/);
   assert.match(await page.locator('#benefits').innerText(), /SERVING DOMINICA · ONGOING SUPPORT/);
   assert.doesNotMatch(await page.locator('body').innerText(), /Antigua/i);
   assert.equal(await page.getByTestId('home-hero').locator('img').getAttribute('src'), '/images/dominica-solar-hero.png');
   assert.doesNotMatch(await page.locator('#benefits').innerText(), /100% local|LOCAL STOCK/);
   assert.equal(await page.locator('header img[src="/flags/dm.svg"]').count(), 1);
   assert.equal(await page.locator('footer img[src="/flags/dm.svg"]').count(), 1);
   assert.equal(await page.getByTestId('calculator-module').locator('img[src="/flags/dm.svg"]').count(), 0);
   assert.doesNotMatch(await page.getByTestId('calculator-module').innerText(), /Location:|historical rate reference|Monthly electricity bill \(EC\$\)/);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   assert.equal(await page.getByTestId('calculator-module').getByRole('slider').getAttribute('min'), '326');
   await page.reload({ waitUntil: 'networkidle' });
   assert.equal(await dialog.isVisible(), false);
   await page.locator('footer').getByRole('button', { name: 'Change installation location' }).click();
   await dialog.getByRole('button', { name: 'Antigua Antigua & Barbuda' }).click();
   await dialog.getByRole('button', { name: 'Save location' }).click();
   await dialog.waitFor({ state: 'hidden' });
   assert.equal(await page.getByTestId('calculator-module').getByRole('slider').getAttribute('min'), '360');
   assert.match(await page.getByTestId('home-hero').innerText(), /UL Certified Equipment/);
   assert.match(await page.locator('#hero-title').innerText(), /Solution for Antigua/);
   assert.match(await page.getByTestId('home-hero').innerText(), /Local Parts Stock/);
   assert.match(await page.locator('#benefits').innerText(), /Your Antigua home/);
   assert.match(await page.locator('#benefits').innerText(), /100% local/);
   await page.goto('http://127.0.0.1:3003/consultation', { waitUntil: 'networkidle' });
   await page.getByRole('heading', { name: 'Start your assessment Antigua' }).waitFor();
   assert.equal(await page.locator('#service-country').count(), 0);
   assert.doesNotMatch(await page.locator('body').innerText(), /Installation location:/);
   assert.equal(await page.getByRole('button', { name: 'Change installation location' }).count(), 0);
   assert.equal(await page.locator('main img[src="/flags/ag.svg"]').count(), 1);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   await page.close();
  }
  console.log('Region first visit, persistence, header/footer, calculator, certification, quotation inheritance and change confirmation passed at mobile/desktop sizes.');
 } finally { await browser.close(); }
})();
