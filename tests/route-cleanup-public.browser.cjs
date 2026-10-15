// Public page smoke checks; all POSTs intercepted, no live writes or telemetry.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.HOME_TEST_ORIGIN;
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().method()==='POST'?r.fulfill({status:200,body:'{}'}):r.continue());
   for(const path of ['/','/privacy',...['antigua','dominica'].flatMap(r=>['','/faq','/how-it-works','/consultation'].map(s=>'/'+r+s))]){
    const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await page.waitForFunction(()=>!document.documentElement.dataset.siteLoading);
    assert.ok(await page.locator('main').isVisible());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path+' at '+width);
    for(const link of await page.locator('a[href="/privacy"]').all())assert.equal(await link.getAttribute('target'),'_blank');
   }
   assert.deepEqual(errors,[]);console.log('PASS all 10 public pages at',width,'px: render, no overflow, privacy links, no page errors');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
