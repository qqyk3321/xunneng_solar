begin;

-- Receipts are committed in the same transaction as the existing price + audit.
-- No employee identity or editable staff plan data is stored in this database.
create table public.quote_plan_publications (
  id uuid primary key,
  version_id uuid not null,
  expected_version integer not null check (expected_version > 0),
  requested_values jsonb not null,
  status text not null check (status in ('succeeded', 'conflict', 'failed')),
  settings jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.quote_plan_publications enable row level security;
revoke all on public.quote_plan_publications from public, anon, authenticated, service_role;
grant select on public.quote_plan_publications to service_role;

create function quote_pricing_private.publish_plan(p_id uuid, p_version_id uuid, p_expected integer, p_values jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  receipt public.quote_plan_publications;
  settings public.quote_pricing_settings;
  outcome text := 'succeeded';
begin
  if p_id is null or p_version_id is null or p_expected is null or p_expected < 1 then
    raise exception 'invalid_publication';
  end if;
  -- Serialize publishers, including different requests with the same expected version.
  select * into strict settings from public.quote_pricing_settings where id = 1 for update;
  select * into receipt from public.quote_plan_publications where id = p_id;
  if found then
    if receipt.version_id <> p_version_id or receipt.expected_version <> p_expected or receipt.requested_values is distinct from p_values then
      raise exception 'publication_id_reused';
    end if;
    return to_jsonb(receipt);
  end if;
  if settings.version <> p_expected then
    outcome := 'conflict';
  else
    begin
      if jsonb_typeof(p_values) is distinct from 'object'
        or not (p_values ?& array['inverter_5kw_usd','inverter_8kw_usd','inverter_10kw_usd','battery_5kwh_usd','panel_usd','price_multiplier','compensation_xcd'])
        or (select count(*) from jsonb_object_keys(p_values)) <> 7
        or exists(select 1 from jsonb_each(p_values) where jsonb_typeof(value) <> 'number') then
        raise exception 'invalid_values';
      end if;
      update public.quote_pricing_settings set
        inverter_5kw_usd = (p_values->>'inverter_5kw_usd')::numeric,
        inverter_8kw_usd = (p_values->>'inverter_8kw_usd')::numeric,
        inverter_10kw_usd = (p_values->>'inverter_10kw_usd')::numeric,
        battery_5kwh_usd = (p_values->>'battery_5kwh_usd')::numeric,
        panel_usd = (p_values->>'panel_usd')::numeric,
        price_multiplier = (p_values->>'price_multiplier')::numeric,
        compensation_xcd = (p_values->>'compensation_xcd')::numeric
      where id = 1 returning * into settings;
    exception when others then
      -- This subtransaction rolls back both price and its trigger audit.
      outcome := 'failed';
    end;
  end if;
  insert into public.quote_plan_publications(id, version_id, expected_version, requested_values, status, settings)
    values(p_id, p_version_id, p_expected, p_values, outcome, to_jsonb(settings)) returning * into receipt;
  return to_jsonb(receipt);
end;
$$;
create function public.publish_quote_plan(p_id uuid, p_version_id uuid, p_expected integer, p_values jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select quote_pricing_private.publish_plan(p_id, p_version_id, p_expected, p_values);
$$;
grant usage on schema quote_pricing_private to service_role;
revoke all on function quote_pricing_private.publish_plan(uuid,uuid,integer,jsonb), public.publish_quote_plan(uuid,uuid,integer,jsonb) from public, anon, authenticated, service_role;
grant execute on function quote_pricing_private.publish_plan(uuid,uuid,integer,jsonb), public.publish_quote_plan(uuid,uuid,integer,jsonb) to service_role;
-- Retire the legacy direct-save path. Readers and the existing audit trigger
-- retain their contracts; publishing is the only application write path.
revoke update (inverter_5kw_usd, inverter_8kw_usd, inverter_10kw_usd, battery_5kwh_usd, panel_usd, price_multiplier, compensation_xcd)
  on public.quote_pricing_settings from service_role;
notify pgrst, 'reload schema';
commit;
