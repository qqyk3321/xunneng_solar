-- Synthetic quote configuration and employee identity.
create table if not exists public.staff_profiles(id uuid primary key,email text,display_name text);
insert into public.staff_profiles values('010c98ce-d3ed-420b-ad3a-c5a39f34c179','staff@example.com','Local test employee') on conflict do nothing;
create table if not exists public.quote_pricing_settings (
  id integer primary key,version integer,updated_at timestamptz,
  inverter_5kw_usd numeric,inverter_8kw_usd numeric,inverter_10kw_usd numeric,
  battery_5kwh_usd numeric,panel_usd numeric,price_multiplier numeric,compensation_xcd numeric
);
insert into public.quote_pricing_settings values(1,1,now(),800,1100,1200,600,100,4,500) on conflict do nothing;
grant select on all tables in schema public to service_role;
