-- Current public Contact us / FAQ endpoint. Names retain the preview suffix
-- for compatibility with the application's storage constants, not public access.
begin;

create table public.anonymous_inquiries_preview (
  id uuid primary key,
  created_at timestamptz not null default now(),
  email text not null check (length(email) between 3 and 254),
  message text not null check (length(message) between 5 and 5000),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 3),
  content jsonb,
  format text,
  constraint anonymous_inquiries_preview_content_shape check (
    content is null or (
      jsonb_typeof(content) = 'object'
      and content->>'type' = 'doc'
      and jsonb_typeof(content->'content') = 'array'
      and octet_length(content::text) <= 262144
    ) is true
  ),
  constraint anonymous_inquiries_preview_format_check
    check (format in ('plain', 'rich'))
);

create index anonymous_inquiries_preview_created_idx
  on public.anonymous_inquiries_preview (created_at desc);

alter table public.anonymous_inquiries_preview enable row level security;
revoke all on public.anonymous_inquiries_preview from public, anon, authenticated, service_role;
grant select, insert on public.anonymous_inquiries_preview to service_role;

comment on table public.anonymous_inquiries_preview is
  'Contact us / FAQ submissions. Email is unverified contact information, not account ownership. Staff follow up separately; not a ticket or conversation system.';
comment on column public.anonymous_inquiries_preview.content is
  'Allowlisted Tiptap JSON. inquiryImage.attrs.id references images[].id and private Storage paths. No HTML or signed URLs.';
comment on column public.anonymous_inquiries_preview.format is
  'plain or rich. Nullable for compatibility with archived handlers.';

notify pgrst, 'reload schema';
commit;
