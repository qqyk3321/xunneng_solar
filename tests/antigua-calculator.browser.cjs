// Regression against values produced by the pre-cleanup release, on the real regional pages.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.HOME_TEST_ORIGIN||'http://127.0.0.1:3188';
(async()=>{
 const fixtures=JSON.parse(fs.readFileSync(process.env.CALCULATOR_BASELINE_FIXTURE||require('node:path').join(__dirname,'fixtures/cleanup-calculator-baseline.json')));
 const browser=await chromium.launch();
 try{
  for(const region of ['antigua','dominica']){
   const page=await browser.newPage();await page.route('**/*',r=>r.request().method()==='POST'?r.fulfill({status:200,body:'{}'}):r.continue());
   await page.goto(origin+'/'+region,{waitUntil:'domcontentloaded'});const calculator=page.getByTestId('calculator-module');await calculator.scrollIntoViewIfNeeded();
   for(const item of fixtures.filter(f=>f.region===region)){
    await calculator.getByLabel('Calculator currency').selectOption(item.currency);
    await calculator.getByRole('slider').evaluate((el,value)=>{
     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
    },item.bill);
    for(const [id,expected] of Object.entries(item.expected)){
     await page.waitForFunction(({id,expected})=>document.querySelector(`[data-testid="${id}"]`)?.textContent?.trim()===expected,{id,expected});
     assert.equal((await calculator.getByTestId(id).textContent()).trim(),expected);
    }
   }
   for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
   console.log('PASS',region,'4 currencies × 3 bill levels agree with baseline; responsive layout');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
