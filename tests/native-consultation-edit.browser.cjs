const {authorize}=require('./helpers/native-email.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/pet-reference-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const origin=process.env.NATIVE_TEST_ORIGIN||'http://192.168.1.176:3136';
assert.ok(['127.0.0.1','localhost','192.168.1.176'].includes(new URL(origin).hostname));
const sql=q=>execFileSync('docker',['exec','xunneng-native-test-20261029','psql','-U','postgres','-d','consultations','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8'}).trim();
const out='design/native-consultation-20261030/full-edit';fs.mkdirSync(out,{recursive:true});
const input={schemaVersion:1,name:'Full card test',email:'native-test@example.com',phone:'+12025550101',phoneCountry:'US',address:'123 Test Lane, St Johns',monthlyKwh:650,profile:'evening',answers:{motivations:['bills'],otherMotivation:'',airConditioning:'Two units',wifi:'yes',otherAppliances:'Electric stove'},privacyAccepted:true,privacyVersion:'2026-10-30-native-v2'};
(async()=>{const browser=await chromium.launch();try{
 for(const [width,country] of [[1440,'AG'],[390,'DM'],[320,'AG']]){
  const context=await browser.newContext({viewport:{width,height:1000}});
  await context.addInitScript(()=>{window.gpsCalls=0;navigator.geolocation.getCurrentPosition=()=>{window.gpsCalls++;};sessionStorage.setItem('sol-tide:cookie-ui:dismissed:v2','1');});
  const create=await context.request.post(origin+'/api/consultations',{headers:{origin},data:{requestId:crypto.randomUUID(),website:'',input:{...input,country}}});assert.equal(create.status(),200,await create.text());const {receipt:ack}=await create.json();assert.equal(ack.previewPath,undefined);const receipt=await authorize(context,origin,ack);const token=receipt.previewPath.split('/').at(-1),api='/api/consultations/'+token;
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+receipt.previewPath,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Edit details',exact:true}).click();
  const card=page.locator('[data-assessment-card]');await card.waitFor();
  assert.equal(await card.getByRole('progressbar').getAttribute('aria-valuenow'),'1');
  assert.equal(await card.locator('#address').inputValue(),input.address);
  await card.locator('#address').fill('short');await card.getByRole('button',{name:'Continue',exact:true}).click();await card.locator('#address-error').waitFor();
  const address=`${width} Updated House, Saint Johns`;
  await card.locator('#address').fill(address);await card.locator('#name').fill('Updated full card');
  await page.reload({waitUntil:'domcontentloaded'});await card.locator('#address').waitFor();assert.equal(await card.locator('#address').inputValue(),address);
  await page.screenshot({path:`${out}/contact-${width}.png`,fullPage:false});
  await card.getByRole('button',{name:'Continue',exact:true}).click();
  assert.equal(await card.getByRole('progressbar').getAttribute('aria-valuenow'),'2');
  await card.locator('#monthlyKwh').fill('1800');await card.getByRole('radio',{name:'Nighttime peak',exact:true}).check();
  assert.equal(await card.locator('label[data-selected] svg[viewBox="0 0 240 96"]').count(),4);
  assert.equal(await card.locator('label[data-selected] svg[viewBox="0 0 240 96"]').first().isVisible(),width>700);
  if(width<=700){await card.getByText('View daily pattern',{exact:true}).click();assert.equal(await card.locator('details[open] svg[viewBox="0 0 240 96"]').count(),1);}
  await card.locator('#property-details > summary').click();await card.locator('#wifi').selectOption('no');
  await page.reload({waitUntil:'domcontentloaded'});await card.locator('#monthlyKwh').waitFor();assert.equal(await card.locator('#monthlyKwh').inputValue(),'1800');assert.equal(await card.getByRole('radio',{name:'Nighttime peak',exact:true}).isChecked(),true);
  assert.equal(await card.locator('#privacyAccepted').count(),0);assert.equal(await page.evaluate(()=>window.gpsCalls),0);
  await card.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/electricity-${width}.png`,fullPage:width===1440});
  const requests=[];
  await page.route('**'+api,async route=>{if(route.request().method()!=='PATCH')return route.continue();requests.push(route.request().postDataJSON());if(width===1440&&requests.length===1){const r=await route.fetch();assert.equal(r.status(),200);return route.abort('failed');}await route.continue();});
  await card.getByRole('button',{name:'Save changes',exact:true}).click();
  if(width===1440){await card.getByRole('button',{name:'Retry save',exact:true}).waitFor();await page.reload({waitUntil:'domcontentloaded'});await card.getByRole('button',{name:'Retry save',exact:true}).click();}
  await page.getByRole('button',{name:'Edit details',exact:true}).waitFor();
  assert.equal(requests[0].change.section,'assessment');assert.equal(requests[0].change.values.address,address);assert.equal(requests[0].change.values.name,'Updated full card');assert.equal(requests[0].change.values.monthlyKwh,1800);
  if(width===1440)assert.deepEqual(requests[0],requests[1]);
  const row=(await(await context.request.get(origin+api)).json()).submission;
  assert.equal(row.revision,2);assert.equal(row.address.full,address);assert.equal(row.monthly_kwh,1800);assert.equal(row.answers.wifi,'no');
  assert.equal(sql(`select count(*) from consultation_changes where consultation_id='${receipt.id}'`),'1');assert.equal(sql(`select section from consultation_changes where consultation_id='${receipt.id}'`),'assessment');
  assert.equal(sql(`select count(*) from consultation_notifications where consultation_id='${receipt.id}'`),'1');
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Edit details',exact:true}).waitFor();assert.ok((await page.locator('[aria-labelledby="submitted-details-title"]').innerText()).includes(address));
  await page.getByRole('button',{name:'Edit details',exact:true}).click();await card.locator('#address').fill('Discard this address');await card.getByRole('button',{name:'Cancel',exact:true}).click();assert.ok((await page.locator('[aria-labelledby="submitted-details-title"]').innerText()).includes(address));
  if(width===1440){
   await page.getByRole('button',{name:'Edit details',exact:true}).click();await card.locator('#address').fill('My concurrent updated address');await card.getByRole('button',{name:'Continue',exact:true}).click();
   const other={requestId:crypto.randomUUID(),revision:2,change:{section:'electricity',values:{monthlyKwh:900,profile:'daytime'}}};assert.equal((await context.request.patch(origin+api,{headers:{origin},data:other})).status(),200);
   await card.getByRole('button',{name:'Save changes',exact:true}).click();await card.getByRole('button',{name:'Keep my edits',exact:true}).click();await card.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit details',exact:true}).waitFor();
   assert.equal((await(await context.request.get(origin+api)).json()).submission.revision,4);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await page.evaluate(()=>window.gpsCalls),0);assert.deepEqual(errors,[]);
  const guest=await browser.newContext(),g=await guest.newPage();await g.goto(origin+receipt.previewPath,{waitUntil:'domcontentloaded'});await g.getByRole('heading',{name:'Your details',exact:true}).waitFor();assert.equal(await g.getByRole('button',{name:'Edit details',exact:true}).count(),0);await guest.close();
  console.log(`PASS ${width}px ${country}: shared two-page card, address, validation, refresh, atomic save, one revision/no email, cancel, readonly${width===1440?', lost response and conflict':''}`);
  if(width===1440)fs.writeFileSync('/tmp/native-full-edit-local-fixture.json',JSON.stringify({id:receipt.id,path:receipt.previewPath}),{mode:0o600});
  await context.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
