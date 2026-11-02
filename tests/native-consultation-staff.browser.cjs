const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/pet-reference-browser/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 // Enough synthetic native records to exercise real database pagination.
 for(let i=0;i<25;i++){
  const response=await fetch('http://127.0.0.1:3136/api/consultations',{method:'POST',headers:{origin:'http://127.0.0.1:3136','Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),website:'',input:{schemaVersion:1,country:'AG',name:'Staff browser fixture '+i,email:'native-test@example.com',phone:'+8613812345678',phoneCountry:'CN',address:'100 Test Street, St Johns',monthlyKwh:600,profile:'daytime',answers:{motivations:['bills'],otherMotivation:'',airConditioning:'Two units',wifi:'yes',otherAppliances:'Electric stove'},privacyAccepted:true,privacyVersion:'2026-10-29-native-v1'}})});
  assert.equal(response.status,200);
 }
 const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 await page.goto('http://127.0.0.1:3137/submissions?page=2&country=AG&sort=time&direction=desc',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('main tbody tr').first().waitFor();
 const before=await page.locator('main tbody').innerText();assert.equal(await page.locator('main tbody tr').count(),10);await page.reload({waitUntil:'domcontentloaded'});await page.locator('main tbody tr').first().waitFor();assert.equal(await page.locator('main tbody').innerText(),before);assert.ok(page.url().includes('page=2'));assert.ok(page.url().includes('country=AG'));
 await page.goto('http://127.0.0.1:3137/submissions?email=native-test%40example.com&emailMode=exact',{waitUntil:'domcontentloaded'});await page.getByRole('link',{name:/ST-/}).first().click();await page.locator('[data-testid="submission-detail-card"]').waitFor({timeout:60000});
 await page.getByText('100 Test Street, St Johns',{exact:true}).waitFor();assert.ok(await page.getByRole('link',{name:'打开客户预览页'}).getAttribute('href'));assert.equal(await page.getByRole('link',{name:'打开 Tally 原始预览'}).count(),0);
 await page.screenshot({path:'design/native-consultation-20261029/staff-detail.png',fullPage:true});
 const id=new URL(page.url()).pathname.split('/').at(-1);const requestId=crypto.randomUUID();
 const send=()=>context.request.post(`http://127.0.0.1:3137/api/submissions/${id}/resend`,{headers:{origin:'http://127.0.0.1:3137'},data:{requestId}});
 const first=await send();assert.equal(first.status(),200);assert.equal((await first.json()).status,'pending');assert.equal((await(await send()).json()).status,'pending');
 const history=await context.request.get(`http://127.0.0.1:3137/api/submissions/${id}/emails`);assert.equal(history.status(),200);assert.ok((await history.json()).rows.some(r=>r.type==='manual'));
 await page.goto('http://127.0.0.1:3137/contacts',{waitUntil:'domcontentloaded'});await page.getByText('native-test@example.com',{exact:true}).first().waitFor();await page.screenshot({path:'design/native-consultation-20261029/staff-contacts.png',fullPage:true});
 await context.addCookies([{name:'fixture-denied',value:'true',url:'http://127.0.0.1:3137'}]);assert.equal((await send()).status(),401);assert.equal((await context.request.get(`http://127.0.0.1:3137/api/submissions/${id}/emails`)).status(),401);
 console.log('PASS staff pagination/filter refresh, native detail and all answers, customer link, idempotent manual resend, mail history and contacts, unauthorized read/write');await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
