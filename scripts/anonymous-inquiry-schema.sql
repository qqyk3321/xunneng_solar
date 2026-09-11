-- Deliberately a standalone setup script, not an invented migration history entry.
-- Apply once with: supabase db query --linked --file scripts/anonymous-inquiry-schema.sql
-- Refuses to overwrite an existing table. No business tables or auth settings are changed.
begin;
create table public.anonymous_inquiries_preview (
  id uuid primary key,
  created_at timestamptz not null default now(),
  email text not null check (length(email) between 3 and 254),
  message text not null check (length(message) between 5 and 5000),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 3)
);
create index anonymous_inquiries_preview_created_idx on public.anonymous_inquiries_preview (created_at desc);
alter table public.anonymous_inquiries_preview enable row level security;
revoke all on public.anonymous_inquiries_preview from public, anon, authenticated;
grant select, insert on public.anonymous_inquiries_preview to service_role;
comment on table public.anonymous_inquiries_preview is 'Local-only anonymous contact form preview. Email is unverified contact information, not account ownership. Staff follow up separately by email; not a ticket or conversation system.';
notify pgrst, 'reload schema';
commit;
