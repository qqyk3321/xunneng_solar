const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/pet-reference-browser/node_modules/playwright');
const assert=require('node:assert/strict');
require('node:fs').mkdirSync('design/native-consultation-20261029/success-dialog',{recursive:true});
const origin=process.env.NATIVE_TEST_ORIGIN || 'http://192.168.1.176:3136';
(async()=>{const browser=await chromium.launch();try{
 for(let round=0;round<3;round++){
  const context=await browser.newContext({viewport:{width:round===1?1440:390,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async dialog=>{errors.push('Unexpected browser dialog: '+dialog.type());await dialog.dismiss();});
  await page.goto(origin+'/antigua/consultation',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByLabel('Full name',{exact:false}).waitFor();
  const progress=page.getByRole('progressbar',{name:'Assessment pages'});
  assert.equal(await progress.getAttribute('aria-valuenow'),'1');
  assert.equal(await progress.locator('button, a, [tabindex]').count(),0);
  assert.equal(await page.getByRole('link',{name:'My assessments',exact:true}).count(),0);
  await progress.click();assert.equal(await page.getByRole('heading',{name:'Contact details',exact:true}).count(),1);
  await page.screenshot({path:`design/native-consultation-20261030/ux-flow/contact-${round}.png`,fullPage:true});
  assert.equal(await page.locator('input[required], textarea[required]').count(),4);
  assert.equal(await page.getByText('Saved here for 7 days',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Clear answers',exact:true}).count(),0);
  assert.equal(await page.getByText('* Required',{exact:true}).count(),0);
  for(const id of ['name','email','phone','address']) assert.match(await page.locator(`label[for="${id}"]`).innerText(),/\*/);
  await page.getByLabel('Full name',{exact:false}).fill('Browser Refresh Test');await page.getByLabel('Email address',{exact:false}).fill('native-test@example.com');
  await page.getByRole('button',{name:'Phone country:'}).click();await page.getByLabel('Search phone countries').fill('+86');await page.getByRole('option',{name:'China',exact:false}).click();
  await page.getByLabel('Phone number',{exact:false}).fill('+8613812345678');await page.getByLabel('Installation address',{exact:false}).fill('100 Test Street, St Johns');
  if(round===0){
    // Correcting an invalid value must not move Continue during pointer-down/blur.
    await page.getByLabel('Phone number',{exact:false}).fill('+86138');
    await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#phone-error').waitFor();
    await page.getByLabel('Phone number',{exact:false}).fill('+8613812345678');await page.locator('#phone-error').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'Electricity use'}).waitFor();
    await page.getByRole('button',{name:'Back',exact:true}).click();
  }
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('heading',{name:'Electricity use'}).waitFor();
  assert.equal(await progress.getAttribute('aria-valuenow'),'2');
  assert.equal(await page.locator('input[name="profile"]:checked').count(),0);
  assert.equal(await page.locator('input[name="profile"][required]').count(),4);
  assert.match(await page.locator('fieldset').filter({has:page.getByRole('radio',{name:'Daytime use'})}).locator('legend').innerText(),/\*/);
  assert.equal(await page.locator('#monthlyKwh').getAttribute('required'),'');
  assert.equal(await page.locator('#privacyAccepted').getAttribute('required'),'');
  await page.getByLabel('Highest monthly electricity use',{exact:false}).fill('650');
  await page.getByRole('button',{name:'Send assessment'}).click();
  assert.equal(await page.locator('#profile').evaluate(el=>el===document.activeElement),true);
  await page.getByRole('radio',{name:'Daytime use'}).check();
  await page.keyboard.press('ArrowDown');assert.equal(await page.getByRole('radio',{name:'Morning & evening peaks'}).isChecked(),true);
  await page.keyboard.press('ArrowUp');assert.equal(await page.getByRole('radio',{name:'Daytime use'}).isChecked(),true);
  if(round!==1){
    await page.getByText('View daily pattern',{exact:true}).click();
    await page.getByRole('radio',{name:'Nighttime peak'}).check();
    assert.equal(await page.locator('details[open] strong').innerText(),'Nighttime peak');
    await page.getByRole('radio',{name:'Daytime use'}).check();
    await page.getByText('View daily pattern',{exact:true}).click();
  }
  await page.locator('summary').filter({hasText:'Property details'}).click();await page.getByLabel('Air conditioning',{exact:true}).fill('Two units overnight');await page.getByLabel('Wi-Fi available at the property').selectOption('yes');
  if(round===2) await page.getByLabel('I agree to the privacy notice',{exact:false}).check();
  else {
    let requests=0;const track=request=>{if(request.url().endsWith('/api/consultations'))requests++;};page.on('request',track);
    await page.getByRole('button',{name:'Send assessment'}).click();
    const modal=page.getByRole('dialog',{name:'Confirm your consent'});await modal.waitFor();
    assert.equal(await modal.evaluate(el=>el.matches(':modal')),true);
    assert.equal(await modal.getByRole('checkbox').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
    const privacy=modal.getByRole('link',{name:'privacy notice',exact:true});
    assert.equal(await privacy.getAttribute('href'),'/privacy#native-consultation');
    assert.equal(await privacy.getAttribute('target'),'_blank');
    await page.waitForTimeout(250);await page.screenshot({path:`design/native-consultation-20261029/consent-dialog/dialog-${round===1?'desktop':'phone'}.png`});
    if(round===0){
      const popupPromise=context.waitForEvent('page');await privacy.click();const privacyPage=await popupPromise;
      await privacyPage.waitForURL('**/privacy#native-consultation');await privacyPage.locator('#native-consultation').waitFor();await privacyPage.close();await page.bringToFront();
      assert.equal(await modal.getByRole('checkbox').isChecked(),false);
    }
    await modal.getByRole('checkbox').check();assert.equal(await page.locator('#privacyAccepted').isChecked(),true);
    await modal.getByRole('checkbox').uncheck();assert.equal(await page.locator('#privacyAccepted').isChecked(),false);
    for(const key of ['Tab','Shift+Tab'])for(let tab=0;tab<5;tab++){await page.keyboard.press(key);assert.equal(await modal.evaluate(el=>el.contains(document.activeElement)),true);}
    await modal.getByRole('button',{name:'Close privacy confirmation'}).click();await modal.waitFor({state:'hidden'});
    assert.equal(await page.getByRole('button',{name:'Send assessment'}).evaluate(el=>el===document.activeElement),true);
    await page.getByRole('button',{name:'Send assessment'}).click();await modal.waitFor();await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Send assessment'}).click();await modal.waitFor();await page.mouse.click(5,5);await modal.waitFor({state:'hidden'});
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
    assert.equal(await page.locator('#privacyAccepted').isChecked(),false);
    assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('solortide:consultation:v1:AG')))).phase,'editing');
    assert.equal(requests,0);page.off('request',track);
  }
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Electricity use'}).waitFor();assert.equal(await page.getByLabel('Highest monthly electricity use',{exact:false}).inputValue(),'650');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.waitForTimeout(250);await page.screenshot({path:`design/native-consultation-20261030/ux-flow/electricity-${round===1?'desktop':'phone'}-${round}.png`,fullPage:true});
  // Server commits, then the browser loses the response. Refresh must retain the frozen request.
  let recordedId, submissions=0;await page.route('**/api/consultations',async route=>{submissions++;assert.equal(route.request().postDataJSON().input.privacyAccepted,true);recordedId=route.request().postDataJSON().requestId;const result=await route.fetch();assert.equal(result.status(),200);await route.abort('failed');});
  assert.equal(await page.locator('#privacyAccepted').isChecked(),round===2);
  if(round===2) await page.getByRole('button',{name:'Send assessment'}).dblclick();
  else {
    await page.getByRole('button',{name:'Send assessment'}).click();const modal=page.getByRole('dialog',{name:'Confirm your consent'});await modal.waitFor();
    if(round===1) await modal.getByRole('checkbox').check();
    await modal.getByRole('button',{name:'Agree and send',exact:true}).dblclick();
  }
  await page.getByRole('button',{name:'Check submission',exact:true}).waitFor();
  const cached=await page.evaluate(()=>JSON.parse(localStorage.getItem('solortide:consultation:v1:AG')));assert.equal(cached.phase,'pending');assert.equal(cached.requestId,recordedId);assert.equal(cached.values.privacyAccepted,true);assert.equal(submissions,1);
  await page.unroute('**/api/consultations');await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Check submission',exact:true}).click();await page.getByRole('heading',{name:'Assessment submitted'}).waitFor();
  const success=page.getByRole('dialog',{name:'Assessment submitted',exact:true});
  assert.equal(await success.evaluate(el=>el.matches(':modal')),true);
  assert.equal(await success.getByRole('heading').evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('solortide:consultation:v1:AG')),null);
  await page.screenshot({path:`design/native-consultation-20261029/success-dialog/receipt-${round}.png`});
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Contact details',exact:true}).waitFor();
  const tab=await context.newPage();await tab.goto(origin+'/antigua/consultation',{waitUntil:'domcontentloaded'});await tab.getByRole('heading',{name:'Contact details',exact:true}).waitFor();
  await tab.goto(origin+'/dominica/consultation',{waitUntil:'domcontentloaded'});assert.equal(await tab.getByLabel('Full name',{exact:false}).inputValue(),'');
  await page.waitForTimeout(250);await page.screenshot({path:`design/native-consultation-20261029/success-dialog/receipt-${round}.png`});assert.deepEqual(errors,[]);await context.close();
  console.log('PASS round',round+1,'privacy dialog, link, checkbox, close/Escape/backdrop, focus, confirm/prechecked submit, refresh and frozen retry');
 }
 // Two tabs share a draft, and storage failures are visible without sending an untracked request.
 const ctx=await browser.newContext();const a=await ctx.newPage(),b=await ctx.newPage();await a.goto(origin+'/antigua/consultation',{waitUntil:'domcontentloaded'});await a.getByLabel('Full name',{exact:false}).fill('Shared draft');await b.goto(origin+'/antigua/consultation',{waitUntil:'domcontentloaded'});assert.equal(await b.getByLabel('Full name',{exact:false}).inputValue(),'Shared draft');await b.getByLabel('Full name',{exact:false}).fill('Updated tab');await a.waitForFunction(()=>document.querySelector('#name').value==='Updated tab');await ctx.close();
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('blocked');};});const p=await blocked.newPage();await p.goto(origin+'/antigua/consultation',{waitUntil:'domcontentloaded'});await p.getByRole('alert').filter({hasText:'Browser storage is unavailable'}).waitFor();assert.equal(await p.getByRole('button',{name:'Continue',exact:true}).isDisabled(),true);await blocked.close();console.log('PASS multi-tab and storage-denied recovery');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
