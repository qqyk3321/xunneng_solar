-- Run in an isolated migrated database; all records are rolled back, no notifications sent.
begin;
do $$
declare
  req uuid := gen_random_uuid(); cid uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  token text := repeat('b',64); payload jsonb := '{"schemaVersion":1,"country":"AG","name":"Source test","email":"source@example.test","phone":"+12685550101","phoneCountry":"AG","address":"Test","monthlyKwh":600,"profile":"daytime","answers":{},"privacyAccepted":true,"privacyVersion":"2026-10-30-native-v3"}';
  ctx jsonb := '{"environment":{"ip":"192.0.2.1","ipGeo":{"countryCode":"DM","city":"Roseau"},"device":"mobile","browser":"Safari"}}';
  baseline bigint; after_first bigint; d date := (now() at time zone 'Asia/Shanghai')::date;
  res jsonb; snapshot jsonb; n integer;
begin
  baseline := (public.consultation_source_statistics(d,d)->>'total')::bigint;
  perform public.submit_native_consultation(req,repeat('a',64),cid,payload,token,ctx);
  after_first := (public.consultation_source_statistics(d,d)->>'total')::bigint;
  assert after_first = baseline+1, 'new inquiry counted once';
  select to_jsonb(c) into snapshot from public.consultation_submission_context c where consultation_id=cid;
  assert snapshot->>'ip_country'='DM' and snapshot->>'device_kind'='mobile', 'indexed first source, not installation AG';
  for n in 1..3 loop
    perform public.submit_native_consultation(req,repeat('a',64),gen_random_uuid(),payload,repeat('c',64),'{"environment":{"ipGeo":{"countryCode":"US"},"device":"desktop"}}');
  end loop;
  assert (public.consultation_source_statistics(d,d)->>'total')::bigint=after_first,'retries excluded';
  assert (select to_jsonb(c)=snapshot from public.consultation_submission_context c where consultation_id=cid),'retry keeps original IP/browser/geo';
  insert into public.consultation_management_grants(token_hash,consultation_id,expires_at) values(repeat('d',64),cid,now()+interval '1 hour');
  perform public.update_native_consultation(cid,repeat('d',64),gen_random_uuid(),repeat('e',64),1,'electricity','{"monthlyKwh":900,"profile":"evening"}','{"ipGeo":{"countryCode":"US"},"device":"desktop"}');
  assert (public.consultation_source_statistics(d,d)->>'total')::bigint=after_first,'edits excluded';
  assert (select to_jsonb(c)=snapshot from public.consultation_submission_context c where consultation_id=cid),'edits cannot rewrite initial source';
  perform public.submit_native_consultation(gen_random_uuid(),repeat('a',64),other_id,payload,repeat('f',64),ctx);
  assert (public.consultation_source_statistics(d,d)->>'total')::bigint=after_first+1,'same person/IP new inquiry counts again';
  assert (select environment=ctx->'environment' from public.consultation_submission_context where consultation_id=other_id),'new inquiry retains source metadata';
  -- Use far-future isolated dates for precise boundaries without deleting existing data.
  update public.consultation_submission_context set recorded_at='2090-01-01 23:59:59+08' where consultation_id=cid;
  update public.consultation_submission_context set recorded_at='2090-01-02 00:00:00+08',environment='{}' where consultation_id=other_id;
  res := public.consultation_source_statistics('2090-01-01','2090-01-03');
  assert res->>'total'='2' and jsonb_array_length(res->'series')=3,'range and missing-day fill';
  assert res#>>'{series,0,count}'='1' and res#>>'{series,1,count}'='1' and res#>>'{series,2,count}'='0','Beijing midnight separation';
  assert (public.consultation_source_statistics('2090-01-01','2090-01-01')->>'total')='1','inclusive end date, exclusive next midnight';
  assert (public.consultation_source_statistics('2090-01-01','2090-01-03','day','DM','mobile')->>'total')='1','combined country/device filter';
  assert (public.consultation_source_statistics('2090-01-01','2090-01-03','day','AG')->>'total')='0','no installation country substitution';
  assert (public.consultation_source_statistics('2090-01-01','2090-01-03','day','unknown','unknown')->>'total')='1','missing source stays unknown';
  res := public.consultation_source_statistics('2090-01-02','2090-01-02','hour');
  assert jsonb_array_length(res->'series')=24 and res#>>'{series,0,count}'='1','24 hourly buckets';
  res := public.consultation_source_statistics('2090-01-01','2090-01-03','week');
  assert extract(isodow from (res#>>'{series,0,bucket}')::timestamp)=1,'weeks start Monday';
  assert (public.consultation_source_statistics('2090-01-01','2090-02-02','month')->>'total')='2','monthly total';
  begin perform public.consultation_source_statistics('2090-01-01','2090-02-02','hour');raise exception 'range accepted';exception when invalid_parameter_value then null;end;
  begin perform public.consultation_source_statistics('2090-01-02','2090-01-01');raise exception 'reverse accepted';exception when invalid_parameter_value then null;end;
  assert not has_function_privilege('anon','public.consultation_source_statistics(date,date,text,text,text)','execute'),'anonymous denied';
  assert not has_function_privilege('authenticated','public.consultation_source_statistics(date,date,text,text,text)','execute'),'direct browser denied';
  assert has_function_privilege('service_role','public.consultation_source_statistics(date,date,text,text,text)','execute'),'server allowed';
  assert not has_table_privilege('service_role','public.consultation_submission_context','UPDATE'),'source cannot be rewritten by server';
end $$;
set local role service_role;
select public.consultation_source_statistics('2090-01-01','2090-01-03')->>'total' as server_total;
rollback;
select 'PASS sources: first create, retry, edit, new inquiry, private permissions, timezone, filters and zero buckets' as result;
