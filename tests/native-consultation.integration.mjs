import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const origin=process.env.NATIVE_TEST_ORIGIN||'http://192.168.1.176:3136';
const sql=q=>execFileSync('docker',['exec','xunneng-native-test-20261029','psql','-U','postgres','-d','consultations','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8'}).trim();
const input={schemaVersion:1,country:'AG',name:'Native Integration Test',email:'native-test@example.com',phone:'+8613812345678',phoneCountry:'CN',address:'100 Test Street, St Johns',monthlyKwh:600,profile:'daytime',answers:{motivations:['bills'],otherMotivation:'',airConditioning:'Two units in the evening',wifi:'yes',otherAppliances:'Electric stove'},privacyAccepted:true,privacyVersion:'2026-10-29-native-v1'};
const requestId=randomUUID(),body={requestId,input,website:''};
const send=(value=body,from=origin)=>fetch(origin+'/api/consultations',{method:'POST',headers:{origin:from,'Content-Type':'application/json'},body:JSON.stringify(value)});
let response=await send();assert.equal(response.status,200,await response.clone().text());const first=await response.json();
const replies=await Promise.all(Array.from({length:16},()=>send().then(async r=>({status:r.status,body:await r.json()}))));
for(const r of replies){assert.equal(r.status,200);assert.deepEqual(r.body,first);}
assert.equal(sql(`select count(*) from consultations where request_id='${requestId}'`),'1');
assert.equal(sql(`select count(*) from consultation_notifications where request_id='${requestId}'`),'1');
assert.equal((await send({...body,input:{...input,monthlyKwh:900}})).status,409);
assert.equal((await send(body,'https://untrusted.example')).status,403);
assert.equal((await send({...body,requestId:randomUUID(),input:{...input,phone:'+86123'}})).status,422);
const worker=()=>fetch(origin+'/api/consultations/process-notifications',{method:'POST',headers:{Authorization:'Bearer native-local-worker-secret-at-least-32-characters'}});
assert.equal((await fetch(origin+'/api/consultations/process-notifications',{method:'POST'})).status,401);
await fetch('http://127.0.0.1:3138/__test/fail-next-mail',{method:'POST'});
response=await worker();assert.equal(response.status,200,await response.clone().text());
// Schedule only this test's queued job immediately after the injected mail failure.
sql(`update consultation_notifications set next_attempt_at=now() where request_id='${requestId}' and status='pending'`);
await worker();assert.equal(sql(`select status from consultation_notifications where request_id='${requestId}'`),'accepted');
assert.equal(first.receipt.previewPath,undefined);
const previewPath=new URL(sql(`select delivery_payload->'template'->'variables'->>'PREVIEW_URL' from consultation_notifications where consultation_id='${first.receipt.id}' and kind='automatic'`)).pathname;
const page=await fetch(origin+previewPath);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('Native Integration Test'));assert.ok(html.includes('Electric stove'));assert.ok(!html.includes('tally.so/embed'));
const wrongRegion=await fetch(origin+previewPath.replace('/antigua/','/dominica/')); const wrongHtml=await wrongRegion.text(); assert.ok(!wrongHtml.includes('Native Integration Test')); assert.ok(wrongRegion.status===404 || wrongHtml.includes('NEXT_HTTP_ERROR_FALLBACK;404')); 
const countBefore=(await(await fetch('http://127.0.0.1:3138/__test/mail-count')).json()).count;
await send();await worker();assert.equal((await(await fetch('http://127.0.0.1:3138/__test/mail-count')).json()).count,countBefore);
// Database role boundary: anonymous callers cannot read PII or invoke the write RPC.
for(const query of ['select * from consultations','select * from consultation_records',`select submit_native_consultation('${requestId}','${'a'.repeat(64)}','${randomUUID()}','{}','${'b'.repeat(64)}')`]){
  let denied=false;try{sql('set role anon;'+query);}catch{denied=true;}assert.ok(denied,'anonymous access must be denied');
}
console.log('PASS: 16 concurrent retries, one record and notification, conflict, invalid phone, origin, customer preview isolation, mail retry/idempotency, database permissions');
console.log(JSON.stringify({id:first.receipt.id,reference:first.receipt.reference}));
