// Isolated local database only; never reads project credentials or sends mail.
import emailHelper from './helpers/native-email.cjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const origin = process.env.NATIVE_TEST_ORIGIN || 'http://192.168.1.176:3136';
assert.ok(['127.0.0.1', 'localhost', '192.168.1.176'].includes(new URL(origin).hostname));
const sql = q => execFileSync('docker', ['exec', 'xunneng-native-test-20261029', 'psql', '-U', 'postgres', '-d', 'consultations', '-At', '-v', 'ON_ERROR_STOP=1', '-c', q], { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
const input = { schemaVersion: 1, country: 'AG', name: 'Environment test', email: 'native-test@example.com', phone: '+12025550101', phoneCountry: 'US', address: '123 Test Street, St Johns', monthlyKwh: 650, profile: 'evening', answers: { motivations: [], otherMotivation: '', airConditioning: '', wifi: '', otherAppliances: '' }, privacyAccepted: true, privacyVersion: '2026-10-30-native-v2' };
const location = { status: 'captured', latitude: 17.1274, longitude: -61.8468, accuracy: 35, capturedAt: new Date().toISOString() };
const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const api = (path, method, body, cookie = '', userAgent = ua) => fetch(origin + path, { method, headers: { origin, 'content-type': 'application/json', 'user-agent': userAgent, 'x-forwarded-for': '198.51.100.99', ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const expect = async (response, status = 200) => { assert.equal(response.status, status, await response.clone().text()); return response.json(); };
const body = { requestId: randomUUID(), input, website: '', location };
const first = await api('/api/consultations', 'POST', body); assert.equal(first.headers.get('set-cookie'),null);
const { receipt } = await expect(first), id = receipt.id;assert.equal(receipt.previewPath,undefined);
const link=await emailHelper.emailLink(origin,id),path=link.pathname;
const access=await api('/api/consultations/'+path.split('/').at(-1)+'/access','POST',{credential:new URLSearchParams(link.hash.slice(1)).get('edit')});await expect(access);const cookie=access.headers.get('set-cookie').split(';')[0];
const context = () => JSON.parse(sql(`select row_to_json(c) from consultation_submission_context c where consultation_id='${id}'`));
const original = context();
assert.equal(original.environment.ip, null, 'direct local server must not trust spoofed forwarded headers');
assert.equal(original.environment.device, 'mobile'); assert.equal(original.environment.os, 'iOS');
assert.equal(original.location,undefined);
assert.equal(original.environment.ipGeo,null);
assert.equal(sql("select count(*) from information_schema.columns where table_name='consultation_submission_context' and column_name='location'"),'0');
assert.equal(original.notice_version, input.privacyVersion);
// Concurrent duplicate creates with changed network metadata keep the first context.
await Promise.all(Array.from({ length: 6 }, () => api('/api/consultations', 'POST', { ...body, location: { status: 'denied' } }, cookie, 'Changed UA').then(expect)));
assert.deepEqual(context(), original);
assert.equal(sql(`select count(*) from consultation_notifications where consultation_id='${id}'`), '1');
const endpoint = '/api/consultations/' + path.split('/').at(-1);
const change = { requestId: randomUUID(), revision: 1, change: { section: 'electricity', values: { monthlyKwh: 850, profile: 'daytime' } } };
await expect(await api(endpoint, 'PATCH', change), 403);
await expect(await api(endpoint, 'PATCH', { ...change, location }, cookie), 422);
await Promise.all(Array.from({ length: 6 }, () => api(endpoint, 'PATCH', change, cookie, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36').then(expect)));
assert.equal(sql(`select count(*) from consultation_changes where consultation_id='${id}'`), '1');
const changed = JSON.parse(sql(`select environment from consultation_changes where consultation_id='${id}'`));
assert.equal(changed.browser, 'Chrome'); assert.equal(changed.os, 'Windows'); assert.equal(changed.location, undefined);
await expect(await api(endpoint, 'PATCH', change, cookie, 'Retry browser'));
assert.deepEqual(JSON.parse(sql(`select environment from consultation_changes where consultation_id='${id}'`)), changed);
// Public HTML, customer GET and conflict payload must not contain private context.
const html = await (await fetch(origin + path)).text();
const get = await expect(await api(endpoint, 'GET', undefined, cookie));
const conflict = await expect(await api(endpoint, 'PATCH', { ...change, requestId: randomUUID() }, cookie), 409);
for (const data of [html, JSON.stringify(get), JSON.stringify(conflict)]) {
  assert.ok(!data.includes('17.1274')); assert.ok(!data.includes(ua)); assert.ok(!data.includes('198.51.100.99'));
  assert.ok(!data.includes('"environment":')); assert.ok(!data.includes('"location":'));
}
for (const role of ['anon', 'authenticated']) {
  for (const table of ['consultation_submission_context', 'consultation_changes']) assert.throws(() => sql(`set role ${role}; select * from ${table}`));
}
assert.equal(sql("select relrowsecurity from pg_class where oid='public.consultation_submission_context'::regclass"), 't');
assert.equal(sql("select has_function_privilege('anon','public.submit_native_consultation(uuid,text,uuid,jsonb,text,jsonb)','execute')"), 'f');
assert.equal(sql("select has_function_privilege('authenticated','public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb,jsonb)','execute')"), 'f');
writeFileSync('/tmp/native-environment-fixture.json', JSON.stringify({ id, receipt, cookie }));
console.log('PASS atomic first context, concurrent create/edit retries, changed UA, denied edits, no GPS on edits, private customer responses and RLS');
