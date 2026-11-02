import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const {id}=JSON.parse(fs.readFileSync('/tmp/native-full-edit-local-fixture.json'));
assert.match(id,/^[a-f0-9-]{36}$/);
const sql=q=>execFileSync('docker',['exec','xunneng-native-test-20261029','psql','-U','postgres','-d','consultations','-At','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8'}).trim();
sql(`begin; do $$ declare original public.consultations; grant_hash text; input jsonb; begin
select * into strict original from public.consultations where id='${id}';
select token_hash into strict grant_hash from public.consultation_management_grants where consultation_id=original.id and expires_at>now() limit 1;
input=jsonb_build_object('name','Must roll back','email',original.email,'phone',original.phone,'phoneCountry',original.phone_country,'address','Must roll back address','monthlyKwh',1200,'profile','night','answers',original.answers);
begin
 perform public.update_native_consultation(original.id,grant_hash,gen_random_uuid(),'rollback-test',original.revision,'assessment',input,'{"location":true}'::jsonb);
 raise exception 'Expected environment check to fail';
exception when check_violation then null;
end;
if exists(select 1 from public.consultations where id=original.id and (name<>original.name or address<>original.address or revision<>original.revision or monthly_kwh<>original.monthly_kwh)) then raise exception 'Partial save leaked';end if;
end $$; rollback;`);
assert.equal(sql("select has_function_privilege('anon','public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb,jsonb)','execute')"),'f');
assert.equal(sql("select has_function_privilege('authenticated','public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb,jsonb)','execute')"),'f');
assert.equal(sql("select has_function_privilege('service_role','public.update_native_consultation(uuid,text,uuid,text,integer,text,jsonb,jsonb)','execute')"),'t');
console.log('PASS entire assessment rolls back if audit insertion fails; privileged execution only');
