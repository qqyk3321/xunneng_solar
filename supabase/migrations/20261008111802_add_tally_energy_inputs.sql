begin;
alter table public.tally_form_submissions
  add column monthly_kwh numeric,
  add column consumption_profile text,
  add constraint tally_energy_inputs_check check (
    (monthly_kwh is null and consumption_profile is null) or
    (monthly_kwh is not null and monthly_kwh > 0 and monthly_kwh <= 1000000
      and consumption_profile is not null and consumption_profile in ('daytime', 'rush', 'evening', 'night'))
  );
comment on column public.tally_form_submissions.monthly_kwh is 'Highest monthly electricity use (kWh) submitted through Tally. NULL for legacy submissions.';
comment on column public.tally_form_submissions.consumption_profile is 'Daily electricity-use profile: daytime, rush, evening, night. NULL for legacy submissions.';
alter table public.tally_form_submissions drop constraint tally_form_submissions_address_check;
alter table public.tally_form_submissions add constraint tally_form_submissions_address_check check (
  jsonb_typeof(address) = 'object' and (
    (jsonb_typeof(address->'full_address') = 'string' and coalesce(length(btrim(address->>'full_address')), 0) between 1 and 3000)
    or (address ?& array['parish', 'town', 'street', 'building', 'directions']
      and coalesce(length(btrim(address->>'parish')), 0) > 0
      and coalesce(length(btrim(address->>'town')), 0) > 0
      and coalesce(length(btrim(address->>'street')), 0) > 0)
  )
);
create index consultation_email_audit_accepted_submission_idx
  on public.consultation_email_audit (tally_submission_row_id) where status = 'accepted';
-- Plans and calculated quotes deliberately remain transient.
commit;
