// Current regional FAQ search, filtering, disclosures and navigation. No live submissions.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.HOME_TEST_ORIGIN||process.env.PREVIEW_TEST_ORIGIN||'http://127.0.0.1:3188';
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const region of ['antigua','dominica'])for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().method()==='POST'?r.fulfill({status:200,body:'{}'}):r.continue());
   await page.goto(origin+'/'+region+'/faq',{waitUntil:'domcontentloaded'});
   const results=page.locator('#faq-results details');await results.first().waitFor();const count=await results.count();assert.ok(count>0);
   await results.first().locator('summary').click();assert.ok(await results.first().getAttribute('open')!==null);
   const search=page.getByLabel('Search the FAQ');await search.fill('battery');
   await page.waitForFunction(()=>document.querySelector('#faq-results details[open]'));
   assert.ok(await results.count()>0);assert.match(await page.locator('#faq-results').innerText(),/battery/i);
   await search.fill('no-matching-fixture-123');await page.getByRole('heading',{name:'No matching questions.'}).waitFor();
   await page.getByRole('button',{name:'Clear search'}).click();await page.waitForFunction(n=>document.querySelectorAll('#faq-results details').length===n,count);
   if(width<=1000)await page.getByLabel('Topic',{exact:true}).selectOption('getting-started');
   else await page.getByRole('group',{name:'Filter questions by topic'}).getByRole('button').nth(1).click();
   await page.waitForFunction(n=>document.querySelectorAll('#faq-results details').length<n,count);assert.ok(await results.count()>0);
   assert.equal(await page.locator(`footer a[href="/${region}/consultation"]`).count(),1);
   assert.equal(await page.locator('footer a[href="/privacy"]').getAttribute('target'),'_blank');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   console.log('PASS',region,width,'FAQ search, empty state, clear, topics, accordion and regional links');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
