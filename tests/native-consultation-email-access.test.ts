import test from 'node:test';
import assert from 'node:assert/strict';
import {emailAccessToken,validEmailAccess} from '../lib/native-consultation/email-access-token';
import {previewToken} from '../packages/consultation-core/tokens';
import {linkedPreviewQrHtml} from '../supabase/functions/_shared/consultation-qr';
const secret='isolated-unit-test-secret-more-than-32-chars';
test('email authority is independent of the share token, scoped to the record and current email',()=>{
 const token=emailAccessToken('record-a','customer@example.com',secret);
 assert.ok(validEmailAccess(token,'record-a',' Customer@Example.com ',secret));
 assert.ok(!validEmailAccess(token,'record-b','customer@example.com',secret));
 assert.ok(!validEmailAccess(token,'record-a','changed@example.com',secret));
 assert.ok(!validEmailAccess(previewToken('record-a',secret),'record-a','customer@example.com',secret));
 assert.ok(!validEmailAccess(token,'record-a','customer@example.com',secret+'different'));
 assert.ok(!validEmailAccess('x','record-a','customer@example.com',secret));
});
test('email QR itself is clickable without HTML injection or an unsafe protocol',()=>{
 const html=linkedPreviewQrHtml('https://example.com/antigua/submission/example#edit=test&other=1');
 assert.match(html,/<a href="https:\/\/example.com\/antigua\/submission\/example#edit=test&amp;other=1"/);
 assert.match(html,/<img [^>]+cid:/);assert.match(html,/<\/a><\/td>/);
 assert.throws(()=>linkedPreviewQrHtml('javascript:alert(1)'));
});
