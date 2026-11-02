import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const origin='http://127.0.0.1:3136';
const sql=q=>execFileSync('docker',['exec','xunneng-native-test-20261029','psql','-U','postgres','-d','consultations','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8'}).trim();
const worker=()=>fetch(origin+'/api/consultations/process-notifications',{method:'POST',headers:{Authorization:'Bearer native-local-worker-secret-at-least-32-characters'}});
const mailCount=async()=>(await(await fetch('http://127.0.0.1:3138/__test/mail-count')).json()).count;
const before=await mailCount(),queued=Number(sql("select count(*) from consultation_notifications where status='pending'"));
for(let round=0;round<30 && Number(sql("select count(*) from consultation_notifications where status='pending'"));round++){
  const results=await Promise.all(Array.from({length:3},worker));
  for(const response of results)assert.equal(response.status,200,await response.text());
}
assert.equal(sql("select count(*) from consultation_notifications where status='pending'"),'0');
assert.equal(await mailCount(),before+queued);
assert.ok(Number(sql("select count(*) from consultation_notifications where kind='manual' and status='accepted'"))>0);
await Promise.all([worker(),worker()]);assert.equal(await mailCount(),before+queued);
// A response arriving after a lease was replaced cannot overwrite the current job.
const id=sql("select id from consultations order by submitted_at desc limit 1"),requestId=randomUUID();
sql(`insert into consultation_notifications(consultation_id,kind,request_id,actor_id,actor_email,first_attempt_at) values('${id}','manual','${requestId}','${randomUUID()}','staff@example.com',now()-interval '25 hours')`);
const job=sql(`select id from consultation_notifications where request_id='${requestId}'`);
assert.equal(sql(`select finish_consultation_notification('${job}','${randomUUID()}','accepted','bogus',200,null)`),'f');
await worker();assert.equal(sql(`select status from consultation_notifications where id='${job}'`),'failed');
assert.equal(await mailCount(),before+queued);
console.log('PASS: concurrent workers send each queued mail once, manual resend completes, repeated workers are idle, stale lease cannot complete a job, expired provider window stops before sending');
