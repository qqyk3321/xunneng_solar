import emailHelper from './helpers/native-email.cjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const origin=process.env.NATIVE_TEST_ORIGIN || 'http://192.168.1.176:3136';
assert.ok(['127.0.0.1','localhost','192.168.1.176'].includes(new URL(origin).hostname));
const sql=q=>execFileSync('docker',['exec','xunneng-native-test-20261029','psql','-U','postgres','-d','consultations','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const input={schemaVersion:1,country:'AG',name:'Self service test',email:'native-test@example.com',phone:'+12025550101',phoneCountry:'US',address:'123 Test Lane, St Johns',monthlyKwh:650,profile:'evening',answers:{motivations:['bills'],otherMotivation:'',airConditioning:'Two units',wifi:'yes',otherAppliances:'Electric stove'},privacyAccepted:true,privacyVersion:'2026-10-29-native-v1'};
const api=(path,method='GET',body,cookie='',from=origin)=>fetch(origin+path,{method,headers:{origin:from,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
const expect=async(r,status)=>{assert.equal(r.status,status,await r.clone().text());return r.json();};
const cookieOf=r=>r.headers.get('set-cookie').split(';')[0];
for(let round=1;round<=3;round++){
 const creation={requestId:randomUUID(),input,website:''};
 let response=await api('/api/consultations','POST',creation);const created=await expect(response,200);
 assert.equal(response.headers.get('set-cookie'),null);assert.equal(created.receipt.previewPath,undefined);
 const initialLink=await emailHelper.emailLink(origin,created.receipt.id);
 response=await api('/api/consultations/'+initialLink.pathname.split('/').at(-1)+'/access','POST',{credential:new URLSearchParams(initialLink.hash.slice(1)).get('edit')});await expect(response,200);const cookie=cookieOf(response);
 assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/SameSite=Lax/);
 const {id}=created.receipt,path=initialLink.pathname,token=path.split('/').at(-1),endpoint='/api/consultations/'+token;
 const change={requestId:randomUUID(),revision:1,change:{section:'electricity',values:{monthlyKwh:850,profile:'daytime'}}};
 await expect(await api(endpoint,'PATCH',change),403);await expect(await api(endpoint),403);
 await expect(await api(endpoint,'PATCH',change,cookie,'https://untrusted.example'),403);
 const replies=await Promise.all(Array.from({length:8},()=>api(endpoint,'PATCH',change,cookie).then(r=>expect(r,200))));
 for(const result of replies)assert.equal(result.submission.revision,2);
 assert.equal(sql(`select count(*) from consultation_changes where consultation_id='${id}'`),'1');
 assert.equal(sql(`select count(*) from consultations where id='${id}'`),'1');
 await expect(await api(endpoint,'PATCH',{...change,requestId:randomUUID()},cookie),409);
 await expect(await api(endpoint,'PATCH',{...change,change:{section:'electricity',values:{monthlyKwh:999,profile:'daytime'}}},cookie),409);
 await expect(await api(endpoint,'PATCH',{...change,revision:2,requestId:randomUUID(),change:{section:'contact',values:{name:'Test',email:'bad',phone:'+123',phoneCountry:'US'}}},cookie),422);
 await expect(await api(endpoint,'PATCH',{...change,revision:2,requestId:randomUUID(),change:{section:'electricity',values:{monthlyKwh:1,profile:'night',country:'DM'}}},cookie),422);
 assert.deepEqual(await expect(await api('/api/consultations','POST',creation,cookie),200),created);
 // Open the actual customer email on a new device, directly into this result.
 let delivery;
 for(let attempt=0;attempt<60;attempt++){
   const response=await fetch(origin+'/api/consultations/process-notifications',{method:'POST',headers:{Authorization:'Bearer native-local-worker-secret-at-least-32-characters'}});
   await expect(response,200);
   const payload=sql(`select delivery_payload::text from consultation_notifications where consultation_id='${id}' and kind='automatic'`);
   if(payload){delivery=JSON.parse(payload);break;}
 }
 assert.ok(delivery,'worker prepared the customer email');
 const link=new URL(delivery.template.variables.PREVIEW_URL);
 assert.equal(link.pathname,path);assert.match(link.hash,/^#edit=[A-Za-z0-9_-]{43}$/);
 assert.ok(delivery.template.variables.PREVIEW_QR_HTML.includes(`href="${link.href}"`));
 assert.equal(delivery.attachments.length,1);
 const credential=new URLSearchParams(link.hash.slice(1)).get('edit');
 await expect(await api(endpoint+'/access','POST',{credential:token}),403);
 await expect(await api(endpoint+'/access','POST',{credential},'','https://untrusted.example'),403);
 response=await api(endpoint+'/access','POST',{credential});await expect(response,200);const recoveredCookie=cookieOf(response);
 await expect(await api(endpoint+'/access','POST',{credential},recoveredCookie),200);
 await expect(await api(endpoint,'GET',undefined,recoveredCookie),200);
 assert.equal(sql(`select count(*) from consultation_management_grants where token_hash=encode(sha256('${recoveredCookie.split('=')[1]}'::bytea),'hex')`),'1');
 assert.equal((await api('/antigua/consultation/manage')).status,404);
 assert.equal((await api('/api/consultations/manage?country=AG')).status,404);
 const update={requestId:randomUUID(),revision:2,change:{section:'contact',values:{name:'Customer corrected name',email:input.email,phone:'+8613812345678',phoneCountry:'CN'}}};
 await expect(await api(endpoint,'PATCH',update,recoveredCookie),200);
 assert.equal(sql(`select revision from consultations where id='${id}'`),'3');
 assert.equal(sql(`select count(*) from consultation_notifications where consultation_id='${id}'`),'1');
 // A different group can only write its own fields, even with old full-form values in the browser.
 const property={requestId:randomUUID(),revision:3,change:{section:'property',values:{address:'456 Corrected Address, St Johns',answers:input.answers}}};
 await expect(await api(endpoint,'PATCH',property,cookie),200);
 assert.equal(sql(`select name||':'||monthly_kwh from consultations where id='${id}'`),'Customer corrected name:850');
 const plain=await api(path);assert.equal(plain.status,200);assert.ok(!(await plain.text()).includes('Edit details'));
 // Revoked/expired management must not confer edit rights.
 sql(`update consultation_management_grants set expires_at=now()-interval '1 second' where consultation_id='${id}'`);
 await expect(await api(endpoint,'PATCH',{...property,requestId:randomUUID(),revision:4},cookie),403);
 // Replaying the original submission must not restore an expired edit grant.
 await expect(await api('/api/consultations','POST',creation,cookie),200);
 await expect(await api(endpoint,'GET',undefined,cookie),403);
 for(const table of ['consultation_management_grants','consultation_changes','consultation_recovery_requests']){
   let denied=false;try{sql('set role anon;select * from '+table);}catch{denied=true;}assert.ok(denied);
 }
 writeFileSync('/tmp/native-edit-fixture.json',JSON.stringify({id,path,cookie,token,creation}));
 console.log(`PASS round ${round}: authenticated edits, 8 concurrent retries, conflict, validation, group isolation, direct email QR access/retry, read-only credential rejection, no duplicate record/mail, expired grants and RLS`);
}
