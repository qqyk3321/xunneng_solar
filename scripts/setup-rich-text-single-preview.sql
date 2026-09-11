-- Isolated single-document lab. No changes to anonymous_inquiries_preview or buckets.
begin;
create table public.rich_text_single_preview (
  id uuid primary key check (id = '00000000-0000-4000-8000-000000000001'::uuid),
  form jsonb not null check (jsonb_typeof(form) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.rich_text_single_preview enable row level security;
revoke all on public.rich_text_single_preview from public, anon, authenticated;
grant select, insert, update on public.rich_text_single_preview to service_role;
comment on table public.rich_text_single_preview is 'Development-only shared form. Every save replaces the one allowed record. Synthetic test data only.';
commit;
