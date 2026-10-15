// Exercise the current regional form. All POSTs are intercepted; no real records or emails.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const origin=process.env.HOME_TEST_ORIGIN||'http://127.0.0.1:3188';
(async()=>{
 const browser=await chromium.launch();
 const image=await sharp({create:{width:2400,height:1600,channels:3,background:{r:80,g:140,b:100}}}).png().toBuffer();
 try{
  for(const [region,width] of [['antigua',1440],['dominica',390],['antigua',320]]){
   const page=await browser.newPage({viewport:{width,height:1000}});const errors=[],posts=[];let fail=true;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const r=route.request();if(r.method()!=='POST')return route.continue();
    if(new URL(r.url()).pathname!=='/api/contact')return route.fulfill({status:200,body:'{}'});
    const form=await new Request(r.url(),{method:'POST',headers:{'content-type':r.headers()['content-type']},body:r.postDataBuffer()}).formData();
    posts.push(form);return route.fulfill({status:fail?503:201,contentType:'application/json',body:JSON.stringify(fail?{error:'Please retry.'}:{reference:form.get('requestId'),receivedAt:new Date().toISOString()})});
   });
   await page.goto(origin+'/'+region);await page.locator('#contact-us').scrollIntoViewIfNeeded();
   const form=page.getByRole('form',{name:'Contact us',exact:true});
   await form.locator('#contact-email').fill('regression@example.test');
   await form.locator('#contact-message').fill('Please help with solar and battery storage.');
   await form.locator('#contact-privacy').check();
   await form.getByRole('button',{name:'Add photos',exact:true}).click();
   const dialog=page.locator('dialog[open]');await dialog.locator('[contenteditable=true]').waitFor();
   await dialog.getByLabel('Choose photos').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:image});
   await dialog.getByRole('button',{name:'Remove photo 1'}).waitFor();
   await dialog.getByRole('button',{name:'Send message',exact:true}).click();
   await dialog.getByRole('alert').waitFor();assert.equal(posts.length,1);
   assert.equal(posts[0].get('country_code'),region==='antigua'?'AG':'DM');
   assert.equal(posts[0].get('format'),'rich');assert.match(posts[0].get('content'),/inquiryImage/);
   const photo=posts[0].get('images');assert.ok(photo.size>0&&photo.size<=150*1024);assert.ok(['image/webp','image/jpeg'].includes(photo.type));
   fail=false;await dialog.getByRole('button',{name:'Send message',exact:true}).click();
   await dialog.getByRole('heading',{name:'We’ve received your request.'}).waitFor();
   assert.equal(posts.length,2);assert.equal(posts[0].get('requestId'),posts[1].get('requestId'));
   assert.equal(posts[0].get('content'),posts[1].get('content'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);console.log('PASS',region,width,'rich-text/photo compression, regional payload, failure/retry, stable request ID');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
