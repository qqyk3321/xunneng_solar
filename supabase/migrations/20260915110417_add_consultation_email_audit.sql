create table public.consultation_email_audit (
  id bigint generated always as identity primary key,
  tally_submission_row_id bigint not null references public.tally_form_submissions(id) on delete cascade,
  recipient_email text not null,
  country_code text not null check (country_code in ('AG', 'DM')),
  support_email text not null,
  resend_template_id text not null,
  resend_idempotency_key text not null,
  status text not null check (status in ('pending', 'accepted', 'failed')),
  resend_email_id text,
  resend_http_status integer,
  error_message text,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz
);

create index consultation_email_audit_submission_attempted_idx
  on public.consultation_email_audit (tally_submission_row_id, attempted_at desc);

create index consultation_email_audit_status_attempted_idx
  on public.consultation_email_audit (status, attempted_at desc);

alter table public.consultation_email_audit enable row level security;
revoke all on public.consultation_email_audit from public, anon, authenticated, service_role;
revoke all on sequence public.consultation_email_audit_id_seq from public, anon, authenticated, service_role;
grant select, insert, update on public.consultation_email_audit to service_role;
grant usage, select on sequence public.consultation_email_audit_id_seq to service_role;
