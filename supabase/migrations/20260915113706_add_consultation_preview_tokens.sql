create table public.consultation_preview_tokens (
  id bigint generated always as identity primary key,
  tally_submission_row_id bigint not null unique references public.tally_form_submissions(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index consultation_preview_tokens_hash_idx on public.consultation_preview_tokens (token_hash);
alter table public.consultation_preview_tokens enable row level security;
revoke all on public.consultation_preview_tokens from public, anon, authenticated, service_role;
revoke all on sequence public.consultation_preview_tokens_id_seq from public, anon, authenticated, service_role;
grant select, insert, update on public.consultation_preview_tokens to service_role;
grant usage, select on sequence public.consultation_preview_tokens_id_seq to service_role;
