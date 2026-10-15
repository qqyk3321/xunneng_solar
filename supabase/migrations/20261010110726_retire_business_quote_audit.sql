begin;

-- Deploy the snapshot-reading webhook first. The migration runner must copy
-- every legacy row into staff and verify equality before supplying this digest.
-- Holding the settings lock also blocks its old audit trigger during cutover.
lock table public.quote_pricing_settings in access exclusive mode;
lock table public.quote_pricing_audit in access exclusive mode;
do $$
declare fingerprint text;
begin
  select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]'::jsonb)::text)
    into fingerprint from public.quote_pricing_audit a;
  if exists(select 1 from public.quote_pricing_audit) and
    fingerprint is distinct from current_setting('app.archived_quote_history_md5',true) then
    raise exception 'Verify the complete staff archive before removing business history';
  end if;
  if exists(select 1 from public.tally_form_submissions
    where monthly_kwh is not null and confirmation_pricing is null) then
    raise exception 'Confirmation pricing backfill is incomplete';
  end if;
end $$;

drop trigger quote_pricing_settings_audit on public.quote_pricing_settings;
drop function quote_pricing_private.audit_settings();
drop table public.quote_pricing_audit;

-- Keep the public current-price contract and optimistic concurrency unchanged.
-- This trigger never appends an operation record in the business database.
create function quote_pricing_private.version_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['version','updated_at']) = (to_jsonb(old) - array['version','updated_at']) then
      new.version := old.version;
      new.updated_at := old.updated_at;
      return new;
    end if;
    new.version := old.version + 1;
  else
    new.version := 1;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
revoke all on function quote_pricing_private.version_settings() from public, anon, authenticated, service_role;
create trigger quote_pricing_settings_version before insert or update on public.quote_pricing_settings
  for each row execute function quote_pricing_private.version_settings();
comment on table public.quote_pricing_settings is
  'Current published quotation prices only. Plan versions and employee operation history live in the staff project.';
notify pgrst, 'reload schema';
commit;
