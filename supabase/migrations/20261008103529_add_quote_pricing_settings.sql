begin;

create schema if not exists quote_pricing_private;
revoke all on schema quote_pricing_private from public, anon, authenticated, service_role;

create table public.quote_pricing_settings (
  id smallint primary key default 1 check (id = 1),
  inverter_5kw_usd numeric not null default 800 check (inverter_5kw_usd between 0 and 1000000 and inverter_5kw_usd = round(inverter_5kw_usd, 2)),
  inverter_8kw_usd numeric not null default 1100 check (inverter_8kw_usd between 0 and 1000000 and inverter_8kw_usd = round(inverter_8kw_usd, 2)),
  inverter_10kw_usd numeric not null default 1200 check (inverter_10kw_usd between 0 and 1000000 and inverter_10kw_usd = round(inverter_10kw_usd, 2)),
  battery_5kwh_usd numeric not null default 600 check (battery_5kwh_usd between 0 and 1000000 and battery_5kwh_usd = round(battery_5kwh_usd, 2)),
  panel_usd numeric not null default 100 check (panel_usd between 0 and 1000000 and panel_usd = round(panel_usd, 2)),
  price_multiplier numeric not null default 4.0 check (price_multiplier > 0 and price_multiplier <= 100 and price_multiplier = round(price_multiplier, 1)),
  compensation_xcd numeric not null default 500 check (compensation_xcd between 0 and 10000000 and compensation_xcd = round(compensation_xcd, 2)),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.quote_pricing_audit (
  id bigint generated always as identity primary key,
  version integer not null unique,
  changed_at timestamptz not null,
  actor text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE')),
  old_values jsonb,
  new_values jsonb not null
);

alter table public.quote_pricing_settings enable row level security;
alter table public.quote_pricing_audit enable row level security;
revoke all on public.quote_pricing_settings, public.quote_pricing_audit from public, anon, authenticated, service_role;
revoke all on sequence public.quote_pricing_audit_id_seq from public, anon, authenticated, service_role;
grant select on public.quote_pricing_settings, public.quote_pricing_audit to service_role;
grant update (inverter_5kw_usd, inverter_8kw_usd, inverter_10kw_usd, battery_5kwh_usd, panel_usd, price_multiplier, compensation_xcd)
  on public.quote_pricing_settings to service_role;

-- Private trigger function is the only application path into the audit table.
-- It also audits direct dashboard edits. No client-controlled timestamp/version.
create function quote_pricing_private.audit_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['version', 'updated_at']) = (to_jsonb(old) - array['version', 'updated_at']) then
      new.version := old.version;
      new.updated_at := old.updated_at;
      return new;
    end if;
    new.version := old.version + 1;
  else
    new.version := 1;
  end if;
  new.updated_at := clock_timestamp();
  insert into public.quote_pricing_audit (version, changed_at, actor, operation, old_values, new_values)
  values (new.version, new.updated_at,
    coalesce(nullif(current_setting('role', true), 'none'), session_user),
    tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
revoke all on function quote_pricing_private.audit_settings() from public, anon, authenticated, service_role;

create trigger quote_pricing_settings_audit before insert or update on public.quote_pricing_settings
  for each row execute function quote_pricing_private.audit_settings();

insert into public.quote_pricing_settings (id) values (1);
comment on table public.quote_pricing_settings is 'Independent Tally email quotation settings. Equipment USD; compensation XCD; fixed conversion USD/XCD 0.37; final ceil to XCD 100.';
comment on table public.quote_pricing_audit is 'Append-only for application roles. Database trigger records initialization and every material change atomically.';
notify pgrst, 'reload schema';
commit;
