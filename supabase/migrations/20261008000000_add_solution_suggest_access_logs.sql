-- Successful, authorized page visits only. UUID is internal deduplication,
-- never an account identifier or access credential.
create table public.solution_suggest_access_logs (
  id uuid primary key,
  accessed_at timestamptz not null default now(),
  page_path text not null default '/solution-suggest'
    check (page_path = '/solution-suggest'),
  ip_address inet,
  user_agent text not null default '' check (char_length(user_agent) <= 1024),
  environment text not null check (environment in ('production', 'preview', 'development'))
);

create index solution_suggest_access_logs_accessed_at_idx
  on public.solution_suggest_access_logs (accessed_at desc);

alter table public.solution_suggest_access_logs enable row level security;
revoke all on public.solution_suggest_access_logs from public, anon, authenticated, service_role;
grant select, insert on public.solution_suggest_access_logs to service_role;

comment on table public.solution_suggest_access_logs is
  'Best-effort successful solution-suggest visits; no passwords, cookies, failed attempts or calculation inputs. Backend only.';
comment on column public.solution_suggest_access_logs.ip_address is
  'IP observed through trusted Vercel request headers. NULL when unavailable or outside the trusted deployment.';
