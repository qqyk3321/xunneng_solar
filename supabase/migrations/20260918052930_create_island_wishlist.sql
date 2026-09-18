create table public.island_wishlist (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  island_code text not null check (island_code in ('BB', 'LC', 'GD', 'KN', 'OTHER')),
  other_island text not null default '' check (char_length(other_island) <= 100),
  status text not null default 'pending' check (status in ('pending', 'notified', 'unsubscribed')),
  notified_at timestamptz,
  source text not null default 'caribbean-home',
  consent_version text not null default 'launch-email-v1',
  constraint wishlist_other_island check (
    (island_code = 'OTHER' and char_length(btrim(other_island)) >= 2)
    or (island_code <> 'OTHER' and other_island = '')
  ),
  constraint wishlist_email_island_unique unique (email, island_code, other_island)
);

create index island_wishlist_pending_idx on public.island_wishlist (island_code, created_at)
  where status = 'pending';
alter table public.island_wishlist enable row level security;
revoke all on table public.island_wishlist from public, anon, authenticated;
revoke all on sequence public.island_wishlist_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.island_wishlist to service_role;
grant usage, select on sequence public.island_wishlist_id_seq to service_role;
comment on table public.island_wishlist is
  'Private launch notification requests. Server-only writes; no automatic notification worker yet.';
