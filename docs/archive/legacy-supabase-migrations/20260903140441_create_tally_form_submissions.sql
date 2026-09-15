create table if not exists public.tally_form_submissions (
  id bigint generated always as identity primary key,
  form_id text not null,
  submission_id text,
  email text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create unique index if not exists tally_form_submissions_form_submission_uidx
  on public.tally_form_submissions (form_id, submission_id)
  where submission_id is not null;

create index if not exists tally_form_submissions_email_idx
  on public.tally_form_submissions (email);

create index if not exists tally_form_submissions_received_at_idx
  on public.tally_form_submissions (received_at desc);

alter table public.tally_form_submissions enable row level security;

revoke all on public.tally_form_submissions from anon;
revoke all on public.tally_form_submissions from authenticated;
