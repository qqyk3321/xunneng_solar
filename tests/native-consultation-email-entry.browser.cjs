const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/pet-reference-browser/node_modules/playwright');
const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
const origin=process.env.NATIVE_TEST_ORIGIN||'http://192.168.1.176:3136';
assert.ok(['127.0.0.1','localhost','192.168.1.176'].includes(new URL(origin).hostname));
const sql=q=>execFileSync('docker',['exec','xunneng-native-test-20261029','psql','-U','postgres','-d','consultations','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const sample={schemaVersion:1,name:'Email entry test',email:'native-test@example.com',phone:'+12025550101',phoneCountry:'US',address:'123 Test Lane, St Johns',monthlyKwh:650,profile:'evening',answers:{motivations:['bills'],otherMotivation:'',airConditioning:'Two units',wifi:'yes',otherAppliances:'Electric stove'},privacyAccepted:true,privacyVersion:'2026-10-29-native-v1'};
(async()=>{const browser=await chromium.launch();try{
 for(const [round,width,country] of [[1,1440,'AG'],[2,390,'AG'],[3,320,'DM']]){
  const owner=await browser.newContext();const response=await owner.request.post(origin+'/api/consultations',{headers:{origin},data:{requestId:crypto.randomUUID(),input:{...sample,country},website:''}});assert.equal(response.status(),200);const {receipt}=await response.json();assert.equal(receipt.previewPath,undefined);assert.equal(response.headers()['set-cookie'],undefined);assert.equal(sql(`select count(*) from consultation_management_grants where consultation_id='${receipt.id}'`),'0');await owner.close();
  let payload;
  for(let i=0;i<60;i++){
   const r=await fetch(origin+'/api/consultations/process-notifications',{method:'POST',headers:{Authorization:'Bearer native-local-worker-secret-at-least-32-characters'}});assert.equal(r.status,200);
   const raw=sql(`select delivery_payload::text from consultation_notifications where consultation_id='${receipt.id}' and kind='automatic'`);if(raw){payload=JSON.parse(raw);break;}
  }
  assert.ok(payload);const mailUrl=new URL(payload.template.variables.PREVIEW_URL);assert.match(mailUrl.hash,/^#edit=/);
  const unsigned=await browser.newContext();assert.equal((await unsigned.request.get(origin+'/api/consultations/'+mailUrl.pathname.split('/').at(-1))).status(),403);await unsigned.close();
  const context=await browser.newContext({viewport:{width,height:900}});await context.addInitScript(()=>{window.sharedAssessmentUrl='';Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.sharedAssessmentUrl=data.url;}});});
  await context.route('**/knocket-sdk/**',r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Simulate an interrupted credential exchange. The email is reusable, and F5 must safely retry.
  let lost=false;if(round===1)await page.route('**/api/consultations/*/access',async route=>{if(!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.goto(origin+mailUrl.pathname+mailUrl.hash,{waitUntil:'domcontentloaded'});
  if(round===1){await page.getByRole('button',{name:'Try again',exact:true}).waitFor();assert.ok(new URL(page.url()).hash);await page.reload({waitUntil:'domcontentloaded'});}
  await page.getByRole('button',{name:'Edit details',exact:true}).waitFor();await page.waitForFunction(()=>!location.hash);assert.equal(await page.getByRole('link',{name:'My assessments',exact:true}).count(),0);
  await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#monthlyKwh').fill('1000');await page.getByRole('radio',{name:'Nighttime peak',exact:true}).check();await page.reload({waitUntil:'domcontentloaded'});await page.locator('#monthlyKwh').waitFor();assert.equal(await page.locator('#monthlyKwh').inputValue(),'1000');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit details',exact:true}).waitFor();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Edit details',exact:true}).waitFor();assert.equal(await page.locator('[data-testid="submission-monthly-kwh"]').innerText(),'1,000 kWh');
  await page.getByRole('button',{name:'Share quote',exact:true}).click();const shared=await page.evaluate(()=>window.sharedAssessmentUrl);assert.ok(shared);assert.equal(new URL(shared).hash,'');assert.equal(new URL(shared).pathname,mailUrl.pathname);
  const guest=await browser.newContext();const g=await guest.newPage();await g.goto(origin+mailUrl.pathname,{waitUntil:'domcontentloaded'});await g.getByRole('heading',{name:'Your details',exact:true}).waitFor();assert.equal(await g.getByRole('button',{name:/^Edit /}).count(),0);await guest.close();
  await page.locator('section[aria-labelledby="submitted-details-title"]').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`design/native-consultation-20261030/ux-flow/email-result-${width}.png`,fullPage:width===1440});assert.deepEqual(errors,[]);await context.close();
  console.log(`PASS email entry ${round}: ${width}px ${country}, direct result/edit, cleared fragment, F5 draft/save, share read-only${round===1?', lost response recovery':''}`);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
