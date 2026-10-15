begin;
alter table public.quote_pricing_settings
  add column current_publication_id uuid,
  add column current_staff_version_id uuid;

-- Only the current publication identity lives beside the current parameters.
-- Every successful new publication advances the concurrency revision, including
-- identical prices; delayed requests therefore cannot overwrite newer work.
create or replace function quote_pricing_private.version_settings()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if (to_jsonb(new)-array['version','updated_at'])=(to_jsonb(old)-array['version','updated_at']) then
      new.version:=old.version; new.updated_at:=old.updated_at; return new;
    end if;
    if new.current_publication_id is not distinct from old.current_publication_id
      and (to_jsonb(new)-array['version','updated_at','current_publication_id','current_staff_version_id'])
        is distinct from (to_jsonb(old)-array['version','updated_at','current_publication_id','current_staff_version_id']) then
      new.current_publication_id:=null; new.current_staff_version_id:=null;
    end if;
    new.version:=old.version+1;
  else new.version:=1;
  end if;
  new.updated_at:=clock_timestamp(); return new;
end $$;

create function quote_pricing_private.apply_current_plan(p_id uuid,p_version_id uuid,p_expected integer,p_values jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.quote_pricing_settings; outcome text:='succeeded'; stamp timestamptz;
begin
  if p_id is null or p_version_id is null or p_expected is null or p_expected<1 then raise exception 'invalid_publication'; end if;
  select * into strict s from public.quote_pricing_settings where id=1 for update;
  if s.current_publication_id=p_id then
    if s.current_staff_version_id is distinct from p_version_id or s.version<>p_expected+1 or
      (to_jsonb(s)-array['id','version','updated_at','current_publication_id','current_staff_version_id']) is distinct from p_values then
      raise exception 'publication_id_reused';
    end if;
  elsif s.version<>p_expected then outcome:='conflict';
  else
    begin
      if jsonb_typeof(p_values) is distinct from 'object'
        or not(p_values ?& array['inverter_5kw_usd','inverter_8kw_usd','inverter_10kw_usd','battery_5kwh_usd','panel_usd','price_multiplier','compensation_xcd'])
        or (select count(*) from jsonb_object_keys(p_values))<>7
        or exists(select 1 from jsonb_each(p_values) where jsonb_typeof(value)<>'number') then raise exception 'invalid_values'; end if;
      update public.quote_pricing_settings set
        inverter_5kw_usd=(p_values->>'inverter_5kw_usd')::numeric,
        inverter_8kw_usd=(p_values->>'inverter_8kw_usd')::numeric,
        inverter_10kw_usd=(p_values->>'inverter_10kw_usd')::numeric,
        battery_5kwh_usd=(p_values->>'battery_5kwh_usd')::numeric,
        panel_usd=(p_values->>'panel_usd')::numeric,
        price_multiplier=(p_values->>'price_multiplier')::numeric,
        compensation_xcd=(p_values->>'compensation_xcd')::numeric,
        current_publication_id=p_id,current_staff_version_id=p_version_id
      where id=1 returning * into s;
    exception when others then outcome:='failed'; end;
  end if;
  stamp:=case when outcome='succeeded' then s.updated_at else clock_timestamp() end;
  return jsonb_build_object('id',p_id,'version_id',p_version_id,'expected_version',p_expected,
    'requested_values',p_values,'status',outcome,'settings',to_jsonb(s)-array['current_publication_id','current_staff_version_id'],'created_at',stamp);
end $$;
create function public.apply_current_quote_plan(p_id uuid,p_version_id uuid,p_expected integer,p_values jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select quote_pricing_private.apply_current_plan(p_id,p_version_id,p_expected,p_values);
$$;
revoke all on function quote_pricing_private.apply_current_plan(uuid,uuid,integer,jsonb),public.apply_current_quote_plan(uuid,uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function quote_pricing_private.apply_current_plan(uuid,uuid,integer,jsonb),public.apply_current_quote_plan(uuid,uuid,integer,jsonb) to service_role;

-- Transitional compatibility for the already deployed staff app. Removed after
-- the new app is live; the new RPC above never writes a publication table.
create or replace function quote_pricing_private.publish_plan(p_id uuid,p_version_id uuid,p_expected integer,p_values jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; old_r public.quote_plan_publications;
begin
  perform 1 from public.quote_pricing_settings where id=1 for update;
  select * into old_r from public.quote_plan_publications where id=p_id;
  if found then
    if old_r.version_id<>p_version_id or old_r.expected_version<>p_expected or old_r.requested_values is distinct from p_values then raise exception 'publication_id_reused'; end if;
    return to_jsonb(old_r);
  end if;
  r:=quote_pricing_private.apply_current_plan(p_id,p_version_id,p_expected,p_values);
  insert into public.quote_plan_publications(id,version_id,expected_version,requested_values,status,settings,created_at)
    values(p_id,p_version_id,p_expected,p_values,r->>'status',r->'settings',(r->>'created_at')::timestamptz);
  return r;
end $$;
notify pgrst,'reload schema';
commit;
