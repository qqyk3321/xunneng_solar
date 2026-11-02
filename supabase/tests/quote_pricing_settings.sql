-- Local disposable database only. This executes publication RPCs; all changes
-- are rolled back. Production checks must remain read-only.
begin;
set local role service_role;
do $$
declare
  old_row public.quote_pricing_settings;
  changed public.quote_pricing_settings;
  result jsonb;
  request_id uuid := gen_random_uuid();
  version_id uuid := gen_random_uuid();
  vals jsonb;
begin
  select * into strict old_row from public.quote_pricing_settings where id=1;
  vals := (to_jsonb(old_row)-array['id','version','updated_at','current_publication_id','current_staff_version_id']) || jsonb_build_object(
    'compensation_xcd',case when old_row.compensation_xcd=500 then 501 else 500 end);
  result := public.apply_current_quote_plan(request_id,version_id,old_row.version,vals);
  assert result->>'status'='succeeded','publication succeeds';
  select * into strict changed from public.quote_pricing_settings where id=1;
  assert changed.version=old_row.version+1,'version increments without business history';
  assert public.apply_current_quote_plan(request_id,version_id,old_row.version,vals)=result,'retry returns original receipt';
  result := public.apply_current_quote_plan(gen_random_uuid(),version_id,old_row.version,vals);
  assert result->>'status'='conflict','stale request rejected';
  result := public.apply_current_quote_plan(gen_random_uuid(),version_id,changed.version,vals);
  assert result->>'status'='succeeded','same values accepted';
  assert (select version from public.quote_pricing_settings)=changed.version+1,'new publication advances revision even for unchanged prices';
  assert (public.apply_current_quote_plan(request_id,version_id,old_row.version,vals)->>'status')='conflict','late duplicate cannot overwrite a newer publication';
  select * into strict changed from public.quote_pricing_settings where id=1;
  result := public.apply_current_quote_plan(gen_random_uuid(),version_id,changed.version,vals || '{"panel_usd":-1}'::jsonb);
  assert result->>'status'='failed','invalid values rejected';
  assert (select to_jsonb(s) from public.quote_pricing_settings s)=to_jsonb(changed),'failed request rolls back price';
  begin
    update public.quote_pricing_settings set panel_usd=1;
    raise exception 'direct write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.quote_pricing_settings;
    raise exception 'delete accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
declare role_name text;
begin
  assert to_regclass('public.quote_pricing_audit') is null,'old business history removed';
  assert to_regclass('public.quote_plan_publications') is null,'publication history absent';
  assert (select count(*) from public.quote_pricing_settings)=1,'one current business row';
  assert to_regprocedure('quote_pricing_private.audit_settings()') is null,'old audit writer removed';
  foreach role_name in array array['anon','authenticated'] loop
    assert not has_table_privilege(role_name,'public.quote_pricing_settings','SELECT'),'settings private';
    assert not has_any_column_privilege(role_name,'public.quote_pricing_settings','UPDATE'),'public writes denied';
    assert not has_function_privilege(role_name,'public.apply_current_quote_plan(uuid,uuid,integer,jsonb)','EXECUTE'),'publishing server only';
  end loop;
  assert (select relrowsecurity from pg_class where oid='public.quote_pricing_settings'::regclass),'settings RLS';
end $$;
rollback;
select 'current pricing, retry, concurrency and permissions checks passed' as result;
