// Only the isolated in-memory pricing backend may be changed by this test.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.HOME_TEST_ORIGIN;
(async()=>{
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 const fixture=JSON.parse(fs.readFileSync(process.env.PREVIEW_ESTIMATE_FIXTURE||require('node:path').join(__dirname,'fixtures/cleanup-quote-baseline.json'))).find(f=>f.label==='DM');
 const setCompensation=value=>fetch('http://127.0.0.1:3199/control',{method:'POST',body:JSON.stringify({compensation:value})});
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.route('**/*',r=>{
   if(r.request().url().startsWith('https://tally.so/'))return r.fulfill({contentType:'text/html',body:'<p>Fixture original record</p>'});
   if(r.request().method()==='POST')return r.fulfill({status:200,body:'{}'});return r.continue();
  });
  await page.goto(`${origin}/dominica/submission/${fixture.token}`,{waitUntil:'domcontentloaded'});
  const quote=page.getByTestId('preview-quote'),saved=page.getByTestId('preview-saved-kwh'),payback=page.getByTestId('preview-payback');
  await quote.waitFor();const before={quote:await quote.innerText(),saved:await saved.innerText(),payback:await payback.innerText()};
  await setCompensation(1500);await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await quote.innerText(),`About EC$${(fixture.estimate.quoteXcd+1000).toLocaleString('en-US')}`);
  assert.equal(await saved.innerText(),before.saved);assert.notEqual(await payback.innerText(),before.payback);
  console.log('PASS current pricing is reread on refresh; quote/payback change, saved electricity stays unchanged');
 }finally{await setCompensation(500);await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
