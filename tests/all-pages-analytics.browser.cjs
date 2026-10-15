// Capture telemetry without sending test events. Synthetic submission URLs use no customer data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.HOME_TEST_ORIGIN;
(async()=>{
 let bypass;
 if(process.env.VERCEL_AUTH_FILE){
  const auth=JSON.parse(fs.readFileSync(process.env.VERCEL_AUTH_FILE));
  const p=await fetch('https://api.vercel.com/v9/projects/prj_V9hqlf9ybbaco7V56luBpw6eMJzr?teamId=team_R29wiwcEoeAPJbdxNgrOsajx',{headers:{Authorization:'Bearer '+auth.token}}).then(r=>r.json());
  bypass=Object.keys(p.protectionBypass||{})[0];
 }
 const browser=await chromium.launch();
 try{
  const publicPaths=['/','/privacy',...['antigua','dominica'].flatMap(r=>['','/consultation','/faq','/how-it-works'].map(s=>'/'+r+s))];
  const privatePaths=['/antigua/submission/private-test-token_A123','/dominica/submission/private-test-token_B456'];
  const paths=process.env.ANALYTICS_SMOKE_ONLY ? ['/privacy','/dominica/faq',...privatePaths] : [...publicPaths,...privatePaths,'/quote-settings','/submission-preview-test'];
  for(const path of paths){
   const context=await browser.newContext({userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'});
   await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
   const posts=[],requests=[],errors=[];
   await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());
    requests.push({url:r.url(),headers:r.headers()});
    if(r.method()==='POST'){posts.push({url:r.url(),body:r.postData(),headers:r.headers()});return route.fulfill({status:200,body:'{}',contentType:'application/json'});}
    if(url.hostname.endsWith('tally.so'))return route.fulfill({contentType:'text/html',body:'<p>No submission</p>'});
    if(bypass && url.origin===origin)return route.continue({headers:{...r.headers(),'x-vercel-protection-bypass':bypass}});
    return route.continue();
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   let response;
   try{response=await page.goto(origin+path+'?test_query=redact-me#redact-me',{waitUntil:'domcontentloaded',timeout:30000});}
   catch{response=await page.goto(origin+path+'?test_query=redact-me#redact-me',{waitUntil:'domcontentloaded',timeout:30000});}
   assert.equal(new URL(page.url()).origin,origin);
   const enabled=publicPaths.includes(path)||privatePaths.includes(path);
   if(enabled)await page.waitForFunction(()=>!!window.va,{timeout:15000});
   // Wait for the initial page view; telemetry fetch is intercepted above.
   for(let i=0;i<30 && enabled && !posts.some(p=>p.url.endsWith('/view'));i++)await page.waitForTimeout(200);
   const views=posts.filter(p=>p.url.endsWith('/view'));
   assert.equal(views.length,enabled?1:0,path);
   if(enabled){
    const data=JSON.parse(views[0].body);
    const expected=privatePaths.includes(path)?path.replace(/\/[^/]+$/,''):path;
    assert.equal(new URL(data.o).pathname,expected);
    assert.equal(new URL(data.o).search,'');assert.equal(new URL(data.o).hash,'');
    assert.ok(!views[0].body.includes('redact-me'));
    await page.waitForSelector('script[data-sdkn="@vercel/speed-insights/next"]',{state:'attached'});
    await page.waitForTimeout(2000);
    await page.mouse.click(2,2);
    await page.evaluate(()=>{
     window.dispatchEvent(new Event('pagehide'));
     document.dispatchEvent(new Event('visibilitychange'));
    });
    for(let i=0;i<30 && !posts.some(p=>p.url.endsWith('/vitals'));i++)await page.waitForTimeout(200);
    const vitals=posts.filter(p=>p.url.endsWith('/vitals'));
    assert.ok(vitals.length>0,'Speed Insights must produce metrics: '+path);
    for(const vital of vitals){
     const payload=JSON.parse(vital.body);
     assert.ok(payload.metrics.length>0);
     for(const metric of payload.metrics){
      assert.equal(new URL(metric.href).pathname,expected);
      assert.equal(new URL(metric.href).search,'');
      assert.equal(new URL(metric.href).hash,'');
     }
     assert.ok(!vital.body.includes('redact-me'));
    }
   }
   if(privatePaths.includes(path)){
    assert.equal(response.headers()['referrer-policy'],'no-referrer');
    assert.ok(!JSON.stringify(posts).includes('private-test-token'));
    for(const req of requests)assert.ok(!(req.headers.referer||'').includes('private-test-token'));
   }
   assert.deepEqual(errors,[]);
   console.log('PASS',path,enabled?'Analytics + Speed Insights enabled; URLs sanitized':'Telemetry excluded');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
