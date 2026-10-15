// Read-only checks. No enquiries, emails or analytics events are sent.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:3003';
(async()=>{
 let bypass;
 if(process.env.VERCEL_AUTH_FILE){
  const auth=JSON.parse(fs.readFileSync(process.env.VERCEL_AUTH_FILE));
  const project=await fetch('https://api.vercel.com/v9/projects/prj_V9hqlf9ybbaco7V56luBpw6eMJzr?teamId=team_R29wiwcEoeAPJbdxNgrOsajx',{headers:{Authorization:'Bearer '+auth.token}}).then(r=>r.json());
  bypass=Object.keys(project.protectionBypass||{})[0];
 }
 const browser=await chromium.launch();
 try {
  for(const width of (process.env.PRIVACY_TEST_WIDTH ? [Number(process.env.PRIVACY_TEST_WIDTH)] : [390,1440])){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await context.addInitScript(()=>{try{sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2','1')}catch{ /* Third-party sandboxed frames cannot access storage. */ }});
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST')return route.fulfill({status:200,body:'{}',contentType:'application/json'});
    if(url.hostname.endsWith('tally.so'))return route.fulfill({contentType:'text/html',body:'<p>Test fixture: no submission</p>'});
    if(bypass && url.origin===origin)return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':bypass}});
    return route.continue();
   });
   const errors=[];
   context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
   const page=await context.newPage();
   const goto=async path=>{
    try{await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});}
    catch{await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});}
    await page.waitForFunction(()=>!document.documentElement.dataset.siteLoading);
   };
   const select=async(slug,suffix)=>{
    const dialog=page.locator('dialog[open]');await dialog.waitFor();
    await dialog.locator('[aria-label="Installation location"] button').nth(slug==='antigua'?0:1).click();
    await dialog.getByRole('button',{name:'Continue',exact:true}).click();
    await page.waitForURL(origin+'/'+slug+suffix);
    await page.waitForFunction(()=>!document.documentElement.dataset.siteLoading);
   };
   for(const slug of ['antigua','dominica']){
    await goto('/'+slug+'/consultation');
    const checkbox=page.locator('main input[type=checkbox]').first();await checkbox.check();
    const link=page.locator('main a[href="/privacy"]').first();
    assert.equal(await link.getAttribute('target'),'_blank');
    const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;
    await popup.waitForLoadState('domcontentloaded');await popup.waitForSelector('h1');
    assert.equal(new URL(popup.url()).pathname,'/privacy');
    assert.equal(await popup.locator('dialog[open]').count(),0);
    assert.equal(await popup.evaluate(()=>window.opener===null),true);
    assert.equal(await popup.locator('link[rel=canonical]').getAttribute('href'),'https://www.solortide.com/privacy');
    assert.equal(await popup.locator('header[data-caribbean-header]').count(),1);
    for(const email of ['ag-support@solortide.com','dm-support@solortide.com'])assert.equal(await popup.locator(`main a[href="mailto:${email}"]`).count(),1);
    assert.ok(await popup.locator('main a[href^="https://wa.me/"]').count());
    assert.ok(await popup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'privacy overflow');
    if(slug==='antigua')await popup.screenshot({path:`/tmp/privacy-redesign-${width}.png`,fullPage:true});
    console.log('Verified privacy tab',width,slug);
    await popup.close();assert.ok(await checkbox.isChecked());assert.equal(new URL(page.url()).pathname,'/'+slug+'/consultation');
   }
   for(const [label,suffix] of [['How it works','/how-it-works'],['FAQ','/faq']]){
    await goto('/');
    if(width<800)await page.getByRole('button',{name:'Open menu',exact:true}).click();
    await page.locator('header').getByRole('button',{name:label,exact:true}).click();
    await select('dominica',suffix);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.solortide.com/dominica'+suffix);
    await page.locator('footer a[href="/dominica/consultation"]').click();
    await page.waitForURL(origin+'/dominica/consultation');assert.equal(await page.locator('dialog[open]').count(),0);
   }
   await goto('/?intent=faq');assert.equal(await page.locator('dialog[open]').count(),0);
   await goto('/privacy');
   await page.locator('footer').getByRole('button',{name:'How it works',exact:true}).click();await select('antigua','/how-it-works');
   await goto('/dominica');
   await page.locator('#contact-email').fill('unsent-draft@example.com');
   const privacy=page.locator('a[href="/privacy"]');
   for(const link of await privacy.all())assert.equal(await link.getAttribute('target'),'_blank');
   const tabPromise=page.waitForEvent('popup');await page.locator('footer a[href="/privacy"]').click();const tab=await tabPromise;await tab.waitForLoadState('domcontentloaded');await tab.close();
   assert.equal(await page.locator('#contact-email').inputValue(),'unsent-draft@example.com');
   assert.equal(new URL(page.url()).pathname,'/dominica');
   assert.deepEqual(errors,[]);
   await context.close();console.log(`PASS ${width}px: privacy new tab, original form state, shared contacts/navigation, regional navigation without legacy query handling.`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
