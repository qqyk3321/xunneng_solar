begin;

-- Transaction input for one confirmation delivery, not staff operation history.
-- Preserve existing provider retry payloads before retiring the old audit table.
alter table public.tally_form_submissions add column confirmation_pricing jsonb;
update public.tally_form_submissions s set confirmation_pricing = (
  select a.new_values from public.quote_pricing_audit a
  where a.changed_at <= s.received_at order by a.version desc limit 1
) where s.monthly_kwh is not null and s.consumption_profile is not null;

do $$ begin
  if exists(select 1 from public.tally_form_submissions
    where monthly_kwh is not null and confirmation_pricing is null) then
    raise exception 'Historical confirmation pricing is missing; stop before retiring history';
  end if;
end $$;

create function quote_pricing_private.freeze_confirmation_pricing()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.confirmation_pricing := old.confirmation_pricing;
  elsif new.monthly_kwh is not null and new.consumption_profile is not null then
    -- Serialize first receipt with a simultaneous staff publication. The caller
    -- cannot provide its own snapshot, even with an INSERT table privilege.
    select to_jsonb(s) into strict new.confirmation_pricing
      from public.quote_pricing_settings s where id = 1 for share;
  else
    new.confirmation_pricing := null;
  end if;
  return new;
end $$;
revoke all on function quote_pricing_private.freeze_confirmation_pricing() from public, anon, authenticated, service_role;
create trigger tally_confirmation_pricing before insert or update on public.tally_form_submissions
  for each row execute function quote_pricing_private.freeze_confirmation_pricing();
comment on column public.tally_form_submissions.confirmation_pricing is
  'Immutable price inputs captured by the database for this submission confirmation only. Customer preview uses current pricing. No employee identity or operation log.';
notify pgrst, 'reload schema';
commit;
