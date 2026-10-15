begin;

create table public.wishlist_confirmation_emails (
  id uuid primary key default gen_random_uuid(),
  wishlist_id bigint not null unique references public.island_wishlist(id) on delete cascade,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending','sending','accepted','failed','unknown')),
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  completed_at timestamptz,
  template_id text,
  resend_email_id text,
  resend_http_status integer,
  error_code text
);
alter table public.wishlist_confirmation_emails enable row level security;
revoke all on table public.wishlist_confirmation_emails from public, anon, authenticated;
grant select, insert, update, delete on table public.wishlist_confirmation_emails to service_role;
create index island_wishlist_created_id_idx on public.island_wishlist(created_at desc, id desc);

-- Only fresh registrations create an audit entry. Existing records are not backfilled.
-- Invoker permissions suffice: wishlist registrations already require service_role.
create function public.record_wishlist_confirmation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.wishlist_confirmation_emails(wishlist_id, recipient_email)
  values (new.id, new.email);
  return new;
end;
$$;
revoke all on function public.record_wishlist_confirmation() from public, anon, authenticated;
grant execute on function public.record_wishlist_confirmation() to service_role;
create trigger wishlist_confirmation_on_insert after insert on public.island_wishlist
for each row execute function public.record_wishlist_confirmation();
comment on table public.wishlist_confirmation_emails is
  'One automatic confirmation per new wishlist registration. Accepted means Resend accepted the request, not delivered. No resend or unsubscribe workflow.';
notify pgrst, 'reload schema';
commit;
