// Regional calculator release checks: no enquiries, emails or analytics writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('tsx/cjs');
const {calculate} = require('../lib/antigua-calculator/calculate.ts');
const {ANTIGUA_CONFIG,DOMINICA_CONFIG} = require('../lib/antigua-calculator/config.ts');
const {currencyBounds,defaultCurrencyBill,formatMoney,fromEc,toEc} = require('../lib/antigua-calculator/currency.ts');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.CALCULATOR_TEST_ORIGIN || 'http://127.0.0.1:3194';
const output=process.env.CALCULATOR_TEST_OUTPUT;
const stage=process.env.CALCULATOR_TEST_STAGE || 'local';
const decimal=new Intl.NumberFormat('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
const clean=s=>s.replace(/\s+/g,' ').trim();
(async()=>{
 const browser=await chromium.launch();const measurements=[];const errors=[];
 try {
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.addInitScript(()=>sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2','1'));
 await context.route('**/*',route=>{
   if(!['GET','HEAD','OPTIONS'].includes(route.request().method()))return route.abort();
   if(new URL(route.request().url()).hostname.endsWith('tally.so'))return route.fulfill({contentType:'text/html',body:''});
   return route.continue(process.env.CALCULATOR_TEST_BYPASS && new URL(route.request().url()).origin===origin?{headers:{...route.request().headers(),'x-vercel-protection-bypass':process.env.CALCULATOR_TEST_BYPASS}}:{});
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 if(output)fs.mkdirSync(output,{recursive:true});
 for(const region of ['antigua','dominica']){
  const config=region==='antigua'?ANTIGUA_CONFIG:DOMINICA_CONFIG;
  for(const [width,height] of [[320,568],[390,568],[390,844],[768,1024],[801,900],[1440,900]]){
   const mobile=width<=800;await page.setViewportSize({width,height});
   let response;
   for(let retry=0;;retry++){try{response=await page.goto(origin+'/'+region,{waitUntil:'domcontentloaded',timeout:60000});break;}catch(e){if(retry>=2||!/net::ERR_/.test(e.message))throw e;}}
   assert.equal(response.status(),200);await page.waitForFunction(()=>!document.documentElement.dataset.siteLoading);await page.evaluate(()=>document.fonts.ready);
   await page.getByRole('link',{name:'Get an Estimate',exact:true}).click();
   await page.waitForFunction(()=>document.activeElement?.id==='calculator');
   const section=page.locator('#calculator');const component=page.getByTestId('calculator-module');const input=page.getByTestId('bill-input');
   const slider=section.getByRole('slider');const currency=section.getByRole('combobox',{name:'Calculator currency'});
   const resultPanel=page.getByTestId('calculator-results');
   const fit=async(label)=>{
    const m=await section.evaluate(el=>{
     const r=el.getBoundingClientRect();const header=document.querySelector('header').getBoundingClientRect();
     const overlaps=[...el.querySelectorAll('[data-metric]')].filter(n=>n.getBoundingClientRect().height).some(n=>{const a=n.querySelector('dt').getBoundingClientRect(),b=n.querySelector('dd').getBoundingClientRect(),c=n.getBoundingClientRect();return (a.right>b.left+.5&&a.left<b.right-.5&&a.bottom>b.top+.5&&a.top<b.bottom-.5)||n.querySelector('dd').scrollWidth>n.clientWidth+1||b.right>c.right+1;});
     return {top:r.top,bottom:r.bottom,height:r.height,headerBottom:header.bottom,overflow:document.documentElement.scrollWidth>innerWidth,overlaps};
    });
    assert.equal(m.overflow,false,`${label}: overflow`);assert.equal(m.overlaps,false,`${label}: overlap`);
    if(mobile){assert.ok(m.top>=m.headerBottom-1,`${label}: header collision ${JSON.stringify(m)}`);assert.ok(m.bottom<=height+1,`${label}: too tall ${JSON.stringify(m)}`);}
    measurements.push({region,width,viewportHeight:height,label,...m});
   };
   assert.equal(await resultPanel.isVisible(),true);assert.equal(await component.getByRole('button',{name:/^(See my estimate|Edit bill)$/}).count(),0);assert.equal(await page.getByTestId('calculator-input').isVisible(),true);
   assert.equal(await section.getByText('System preview',{exact:true}).count(),0);
   assert.equal(await section.getByText('Monthly savings',{exact:true}).count(),0);
   await fit('input');
   if(output && !process.env.CALCULATOR_NO_SCREENSHOTS)await page.screenshot({path:`${output}/${stage}-${region}-${width}x${height}-input.png`});
   const expectValues=async(amount,c)=>{
    const r=calculate(toEc(amount,c),'bill',config);assert.equal(r.status,'ready');
    const expected={price:'~'+formatMoney(fromEc(r.price,c),c)+'+',payback:`~${decimal.format(r.years)} years`,'annual-saving':'~'+formatMoney(fromEc(r.annualSaving,c),c),backup:`~${decimal.format(r.backupHours)} hrs`,'monthly-usage':`~${new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(r.kwh)} kWh`,'recommended-package':r.system.name};
    for(const [id,value] of Object.entries(expected))assert.equal(clean(await page.getByTestId(id).textContent()),value,`${region} ${c} ${amount} ${id}`);
    assert.deepEqual(await component.locator('[data-metric]').evaluateAll(nodes=>nodes.map(n=>n.dataset.metric)),['budget','payback','annual','backup']);
    const size=await component.evaluate(el=>Object.fromEntries(['price','payback','annual-saving','backup'].map(id=>[id,parseFloat(getComputedStyle(el.querySelector(`[data-testid="${id}"]`)).fontSize)])));
    assert.ok(size.price>size['annual-saving']&&size.payback>size.backup);
   };
   for(const c of width===320||width===1440?['USD','XCD','EUR','XCG']:['USD']){
    await currency.selectOption(c);const bounds=currencyBounds(config,c);
    for(const amount of width===320||width===1440?[bounds.min,bounds.max]:[defaultCurrencyBill(config,c)]){
     await input.fill(String(amount));await expectValues(amount,c);const beforeEnter=await page.evaluate(()=>scrollY);await input.press('Enter');await fit('results');assert.ok(Math.abs(await page.evaluate(()=>scrollY)-beforeEnter)<1,'Enter does not scroll');
     if(mobile){assert.equal(await page.getByTestId('calculator-input').isVisible(),true);assert.equal(await resultPanel.isVisible(),true);assert.equal(await input.inputValue(),String(amount));}
    }
   }
   await currency.selectOption('USD');await slider.focus();await slider.press('ArrowRight');assert.equal(await input.inputValue(),'445');
   await input.press('Enter');await expectValues(445,'USD');
   if(output && !process.env.CALCULATOR_NO_SCREENSHOTS)await page.screenshot({path:`${output}/${stage}-${region}-${width}x${height}-results.png`});
   for(const title of ['estimated budget','payback','annual savings','outage backup']){
    const trigger=section.getByRole('button',{name:'About '+title,exact:true});await trigger.click();
    const help=section.locator('[popover]:popover-open');await help.waitFor({state:'visible'});
    const box=await help.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1);
    await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
   }
   await section.getByRole('button',{name:'About estimated budget',exact:true}).click();await page.mouse.click(width-3,Math.max(80,height-3));assert.equal(await section.locator('[popover]:popover-open').count(),0);
   if(!mobile){await section.getByRole('button',{name:'About outage backup',exact:true}).hover();await section.locator('[popover]:popover-open').waitFor();await section.locator('[popover]:popover-open p').first().hover();assert.equal(await section.locator('[popover]:popover-open').count(),1);await page.keyboard.press('Escape');}
   if(width===320||width===1440){
    const trigger=section.getByRole('button',{name:'About estimated monthly usage',exact:true});await trigger.click();assert.match(await section.locator('[popover]:popover-open').innerText(),/Estimated from your monthly bill/);await section.getByRole('button',{name:'Close explanation',exact:true}).click();
    for(const bad of ['', '1','999999']){await input.fill(bad);await input.press('Enter');assert.equal(await input.inputValue(),bad);assert.equal(await section.getByRole('alert').isVisible(),true);assert.equal(clean(await page.getByTestId('price').textContent()),'—');await fit('error');}
   }
   await input.fill('444');await input.press('Enter');await expectValues(444,'USD');
   assert.equal(await resultPanel.getByRole('link',{name:'Get Your Free Assessment',exact:true}).getAttribute('href'),`/${region}/consultation`);
   if(width===390&&height===568){
    const floating=page.locator('button[aria-label="Chat on WhatsApp"][aria-haspopup="dialog"]');
    await floating.waitFor({state:'hidden'});
    await section.evaluate(el=>{window.scrollTo(0,window.scrollY+el.getBoundingClientRect().bottom+16);});
    await floating.waitFor({state:'visible'});
    await section.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await floating.waitFor({state:'hidden'});
    await resultPanel.getByRole('link',{name:'Get Your Free Assessment',exact:true}).click();await page.waitForURL(`**/${region}/consultation`);}
   console.log(`PASS ${stage} ${region} ${width}x${height}: inputs, four estimates, kWh, help, layout and CTA.`);
  }
 }
 assert.deepEqual(errors,[]);
 if(output)fs.writeFileSync(`${output}/${stage}-checks.json`,JSON.stringify({measurements,errors},null,2));
 await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
