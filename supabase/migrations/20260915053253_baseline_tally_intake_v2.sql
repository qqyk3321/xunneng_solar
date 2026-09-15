-- Baseline of the existing V2 Tally schema, verified against the new project.
-- Existing V2 project: record as applied ONLY after schema verification.
-- Empty projects: apply normally. Never apply to the retired V1 database.
begin;
create table public.tally_form_submissions (
  id bigint generated always as identity primary key,
  form_id text not null,
  submission_id text not null,
  event_id text,
  submitted_at timestamptz not null,
  received_at timestamptz not null default now(),
  country_code text not null check (country_code in ('AG', 'DM')),
  country_name text generated always as (
    case country_code when 'AG' then 'Antigua and Barbuda' when 'DM' then 'Dominica' end
  ) stored,
  name text not null check (length(btrim(name)) between 1 and 200),
  email text not null check (length(email) between 3 and 320),
  phone text not null check (length(phone) between 7 and 40),
  address jsonb not null check (
    jsonb_typeof(address) = 'object'
    and address ?& array['parish', 'town', 'street', 'building', 'directions']
    and coalesce(length(btrim(address->>'parish')), 0) > 0
    and coalesce(length(btrim(address->>'town')), 0) > 0
    and coalesce(length(btrim(address->>'street')), 0) > 0
  ),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  unique (form_id, submission_id)
);
create index tally_form_submissions_email_idx on public.tally_form_submissions(email);
create index tally_form_submissions_received_at_idx on public.tally_form_submissions(received_at desc);
alter table public.tally_form_submissions enable row level security;
revoke all on public.tally_form_submissions from public, anon, authenticated;
revoke all on sequence public.tally_form_submissions_id_seq from public, anon, authenticated;
revoke all on public.tally_form_submissions from service_role;
grant select, insert on public.tally_form_submissions to service_role;
revoke all on sequence public.tally_form_submissions_id_seq from service_role;
grant usage, select on sequence public.tally_form_submissions_id_seq to service_role;
commit;
